from fastapi import Depends, FastAPI, Header, HTTPException, Request, Body
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor
from openai import OpenAI
from twilio.rest import Client as TwilioClient
from typing import Optional

import os
import json
import secrets
import requests

from auth import (
    is_valid_admin_key,
    partner_can_update_request,
    require_admin,
    verify_partner_token,
)
from db import get_db_connection


# =========================
# CONFIG
# =========================

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

twilio_client = TwilioClient(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

TWILIO_FROM_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
APP_URL = os.getenv("APP_URL", "https://paulo-teal-nine.vercel.app")
BACKEND_URL = os.getenv("BACKEND_URL", "https://paulo-backend.onrender.com")


class PartnerCreate(BaseModel):
    name: str = Field(..., min_length=2)
    siret: str = Field(..., min_length=9)
    phone: str = Field(..., min_length=8)
    category: str = Field(..., min_length=2)
    subtype: str = Field(..., min_length=2)
    address: str = Field(..., min_length=5)


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    siret: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    subtype: Optional[str] = None
    address: Optional[str] = None


ALLOWED_CATEGORIES = ["commerce", "service_local", "transport", "mairie"]

ALLOWED_SUBTYPES = {
    "commerce": ["fleuriste", "boucher"],
    "service_local": [
        "plombier",
        "electricien",
        "maçon",
        "pisciniste",
        "petits_travaux",
    ],
    "transport": ["taxi"],
    "mairie": ["mairie"],
}


def validate_category_subtype(category: str, subtype: str):
    category = category.strip().lower()
    subtype = subtype.strip().lower()

    if category not in ALLOWED_CATEGORIES:
        return False, "invalid_category"

    if subtype not in ALLOWED_SUBTYPES.get(category, []):
        return False, "invalid_subtype"

    return True, None


# =========================
# HELPERS
# =========================

def normalize_french_phone(phone: str):
    if not phone:
        return None

    cleaned = (
        phone.strip()
        .replace(" ", "")
        .replace(".", "")
        .replace("-", "")
        .replace("/", "")
        .replace("(", "")
        .replace(")", "")
    )

    if cleaned.startswith("whatsapp:"):
        cleaned = cleaned.replace("whatsapp:", "")

    if cleaned.startswith("+33"):
        return cleaned

    if cleaned.startswith("0033"):
        return "+" + cleaned[2:]

    if cleaned.startswith("0") and len(cleaned) == 10:
        return "+33" + cleaned[1:]

    return cleaned


def get_phone_type(phone: str):
    normalized = normalize_french_phone(phone)

    if not normalized:
        return "unknown"

    if normalized.startswith("+336") or normalized.startswith("+337"):
        return "mobile"

    if (
        normalized.startswith("+331")
        or normalized.startswith("+332")
        or normalized.startswith("+333")
        or normalized.startswith("+334")
        or normalized.startswith("+335")
    ):
        return "landline"

    if normalized.startswith("+339"):
        return "voip"

    return "unknown"


def classify_category(message_text: str):
    result = client.responses.create(
        model="gpt-4o-mini",
        input=f"""
Classe cette demande dans UNE seule catégorie parmi :
- transport : déplacement, taxi, trajet
- commerce : achat d’un produit ou rdv commerce
- service_local : prestation d’un professionnel, artisan, travaux, réparation
- mairie : demande administrative, information ou problème dans la commune
- autre

Demande : {message_text}

Réponds uniquement par le nom exact de la catégorie.
"""
    )
    return result.output_text.strip().lower()


def classify_subtype(category: str, message_text: str):
    result = client.responses.create(
        model="gpt-4o-mini",
        input=f"""
Tu dois extraire un sous-type précis à partir de la demande.

Si category = commerce, réponds par un seul mot parmi :
- fleuriste
- boucher
- autre

Si category = service_local, réponds par un seul mot parmi :
- plombier
- electricien
- maçon
- pisciniste
- petits_travaux
- autre

Si category = transport, réponds : taxi
Si category = mairie, réponds : mairie
Sinon réponds : autre

Category : {category}
Demande : {message_text}

Réponds uniquement par le sous-type exact.
"""
    )
    return result.output_text.strip().lower()


def extract_client_info(message_text: str):
    try:
        result = client.responses.create(
            model="gpt-4o-mini",
            input=f"""
Extrait les informations client depuis cette demande.

Retourne uniquement du JSON valide, sans markdown :
{{
  "first_name": null,
  "last_name": null,
  "address": null
}}

Règles :
- Si tu n'es pas sûr, mets null.
- Ne devine pas.
- L'adresse doit être complète si elle est mentionnée.

Demande :
{message_text}
"""
        )

        return json.loads(result.output_text)

    except Exception as e:
        print("❌ Erreur extraction client :", e)
        return {
            "first_name": None,
            "last_name": None,
            "address": None
        }


def upsert_client(phone: str, message_text: str):
    normalized_phone = normalize_french_phone(phone)
    info = extract_client_info(message_text)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO clients (phone, first_name, last_name, address, updated_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (phone)
                DO UPDATE SET
                    first_name = COALESCE(EXCLUDED.first_name, clients.first_name),
                    last_name = COALESCE(EXCLUDED.last_name, clients.last_name),
                    address = COALESCE(EXCLUDED.address, clients.address),
                    updated_at = NOW()
                RETURNING id
            """, (
                normalized_phone,
                info.get("first_name"),
                info.get("last_name"),
                info.get("address"),
            ))

            row = cur.fetchone()

    return row["id"]


def create_request_from_message(phone: str, message_text: str):
    normalized_phone = normalize_french_phone(phone)
    category = classify_category(message_text)
    subtype = classify_subtype(category, message_text)
    client_id = upsert_client(normalized_phone, message_text)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO requests (phone, transcription, category, subtype, client_id)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                normalized_phone,
                message_text,
                category,
                subtype,
                client_id
            ))

    return {
        "phone": normalized_phone,
        "transcription": message_text,
        "category": category,
        "subtype": subtype,
        "client_id": client_id,
    }


# =========================
# APP INIT
# =========================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# BASIC ROUTES
# =========================

@app.get("/")
def root():
    return {"message": "Paulo API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/debug/routes")
def debug_routes():
    return [route.path for route in app.routes]
# =========================
# TWILIO VOICE
# =========================

@app.post("/twilio/voice")
async def twilio_voice(request: Request):
    twiml = f"""
    <Response>
        <Say language="fr-FR" voice="alice">
            Bonjour, vous êtes sur Paulo. Expliquez votre demande après le bip.
        </Say>
        <Record 
            maxLength="120" 
            playBeep="true"
            action="{BACKEND_URL}/twilio/recording"
        />
    </Response>
    """
    return Response(content=twiml, media_type="application/xml")


@app.post("/twilio/recording")
async def recording(request: Request):
    form = await request.form()

    recording_url = form.get("RecordingUrl")
    caller = form.get("From")

    audio_file = requests.get(
        recording_url + ".wav",
        auth=(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    ).content

    with open("audio.wav", "wb") as f:
        f.write(audio_file)

    with open("audio.wav", "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=f
        )

    create_request_from_message(caller, transcript.text)

    return Response(
        content="""
        <Response>
            <Say>Merci, votre demande a bien été enregistrée.</Say>
        </Response>
        """,
        media_type="application/xml"
    )


# =========================
# TWILIO WHATSAPP INBOUND
# =========================

@app.post("/twilio/whatsapp")
async def whatsapp_inbound(request: Request):
    form = await request.form()

    message_body = form.get("Body")
    sender = form.get("From")
    phone = sender.replace("whatsapp:", "") if sender else sender

    if not message_body:
        return Response(
            content="""
            <Response>
                <Message>Je n'ai pas reçu votre message. Pouvez-vous réessayer ?</Message>
            </Response>
            """,
            media_type="application/xml"
        )

    create_request_from_message(phone, message_body)

    return Response(
        content="""
        <Response>
            <Message>Merci, votre demande a bien été enregistrée.</Message>
        </Response>
        """,
        media_type="application/xml"
    )


# =========================
# REQUESTS
# =========================

@app.get("/requests")
def get_requests(_admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    r.id,
                    r.phone,
                    r.transcription,
                    r.category,
                    r.subtype,
                    r.status,
                    r.assigned_partner_id,
                    p.name AS partner_name,
                    r.created_at,
                    r.handled_at,
                    r.archived,
                    r.client_id,
                    c.first_name,
                    c.last_name,
                    c.address
                FROM requests r
                LEFT JOIN partners p ON r.assigned_partner_id = p.id
                LEFT JOIN clients c ON r.client_id = c.id
                WHERE r.archived = false
                ORDER BY r.created_at ASC
            """)
            rows = cur.fetchall()

    return rows


@app.post("/requests/{request_id}/status")
def update_status(
    request_id: int,
    status: str = Body(...),
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
    x_partner_token: Optional[str] = Header(default=None, alias="X-Partner-Token"),
    x_partner_id: Optional[str] = Header(default=None, alias="X-Partner-Id"),
):
    allowed_status = ["new", "in_progress", "done"]

    if status not in allowed_status:
        return {"error": "invalid_status"}

    is_admin = is_valid_admin_key(x_admin_key)
    is_partner = False

    if not is_admin:
        if not x_partner_id or not x_partner_token:
            raise HTTPException(status_code=401, detail="unauthorized")

        try:
            partner_id = int(x_partner_id)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="unauthorized") from exc

        is_partner = partner_can_update_request(
            partner_id, x_partner_token, request_id
        )

        if not is_partner:
            raise HTTPException(status_code=401, detail="unauthorized")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            if status == "done":
                cur.execute(
                    """
                    UPDATE requests
                    SET status = %s, handled_at = NOW()
                    WHERE id = %s
                    """,
                    (status, request_id)
                )
            else:
                cur.execute(
                    """
                    UPDATE requests
                    SET status = %s
                    WHERE id = %s
                    """,
                    (status, request_id)
                )

    return {"ok": True}


@app.post("/requests/{request_id}/archive")
def archive_request(request_id: int, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE requests SET archived = true WHERE id = %s",
                (request_id,)
            )

    return {"ok": True}


@app.post("/requests/{request_id}/assign")
def assign_request(
    request_id: int, payload: dict = Body(...), _admin=Depends(require_admin)
):
    partner_id = payload.get("partner_id")

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, phone, phone_type, access_token, is_active
                FROM partners
                WHERE id = %s
            """, (partner_id,))
            partner = cur.fetchone()

            cur.execute("""
                SELECT 
                    r.id,
                    r.phone,
                    r.transcription,
                    r.category,
                    r.subtype,
                    c.first_name,
                    c.last_name,
                    c.address
                FROM requests r
                LEFT JOIN clients c ON r.client_id = c.id
                WHERE r.id = %s
            """, (request_id,))
            req = cur.fetchone()

            if not partner or not req:
                return {"error": "not_found"}

            if not partner["is_active"]:
                return {"error": "partner_inactive"}

            cur.execute("""
                UPDATE requests
                SET assigned_to = %s,
                    assigned_partner_id = %s
                WHERE id = %s
            """, ("partner", partner_id, request_id))

    partner_url = (
        f"{APP_URL}/partner?"
        f"partner_id={partner['id']}&token={partner['access_token']}"
    )

    client_name = " ".join(
        x for x in [req.get("first_name"), req.get("last_name")] if x
    )

    message = f"""Nouvelle demande Paulo 📩

{req['transcription']}

Catégorie : {req['category']} / {req['subtype']}
Contact client : {req['phone']}
"""

    if client_name:
        message += f"\nClient : {client_name}"

    if req.get("address"):
        message += f"\nAdresse : {req['address']}"

    message += f"""

Voir la demande :
{partner_url}
"""

    phone_type = partner["phone_type"] or get_phone_type(partner["phone"])

    if partner["phone"] and phone_type == "mobile":
        if TWILIO_FROM_NUMBER:
            try:
                twilio_client.messages.create(
                    body=message,
                    from_=TWILIO_FROM_NUMBER,
                    to=partner["phone"]
                )
                print("📨 SMS envoyé à", partner["name"])
            except Exception as e:
                print("❌ Erreur SMS :", e)

        if TWILIO_WHATSAPP_NUMBER:
            try:
                twilio_client.messages.create(
                    body=message,
                    from_="whatsapp:" + TWILIO_WHATSAPP_NUMBER,
                    to="whatsapp:" + partner["phone"]
                )
                print("💬 WhatsApp envoyé à", partner["name"])
            except Exception as e:
                print("❌ Erreur WhatsApp :", e)
    else:
        print("⚠️ Pas de SMS/WhatsApp : numéro non mobile", partner["phone"])

    return {"ok": True}


# =========================
# PARTNERS
# =========================

@app.get("/partners")
def get_partners(_admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    p.id,
                    p.name,
                    p.category,
                    p.subtype,
                    p.is_active,
                    p.siret,
                    p.phone,
                    p.phone_type,
                    p.address,
                    COUNT(r.id) AS assigned_requests_count
                FROM partners p
                LEFT JOIN requests r
                    ON r.assigned_partner_id = p.id
                    AND r.archived = false
                GROUP BY
                    p.id,
                    p.name,
                    p.category,
                    p.subtype,
                    p.is_active,
                    p.siret,
                    p.phone,
                    p.phone_type,
                    p.address
                ORDER BY p.is_active ASC, p.name ASC
            """)
            rows = cur.fetchall()

    return rows


@app.post("/partners/apply")
def create_partner_application(partner: PartnerCreate):
    allowed_categories = ALLOWED_CATEGORIES

    allowed_subtypes = ALLOWED_SUBTYPES

    category = partner.category.strip().lower()
    subtype = partner.subtype.strip().lower()

    if category not in allowed_categories:
        return {"ok": False, "error": "invalid_category"}

    if subtype not in allowed_subtypes.get(category, []):
        return {"ok": False, "error": "invalid_subtype"}

    normalized_phone = normalize_french_phone(partner.phone)
    phone_type = get_phone_type(partner.phone)
    access_token = secrets.token_urlsafe(32)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO partners (
                    name,
                    siret,
                    phone,
                    phone_type,
                    category,
                    subtype,
                    address,
                    is_active,
                    access_token
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, false, %s)
                RETURNING id, name, access_token, is_active
            """, (
                partner.name.strip(),
                partner.siret.strip(),
                normalized_phone,
                phone_type,
                category,
                subtype,
                partner.address.strip(),
                access_token
            ))

            new_partner = cur.fetchone()

    return {
        "ok": True,
        "partner": new_partner
    }


@app.post("/partners/{partner_id}/activate")
def activate_partner(partner_id: int, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE partners
                SET is_active = true
                WHERE id = %s
                """,
                (partner_id,)
            )

    return {"ok": True}


@app.post("/partners/{partner_id}/deactivate")
def deactivate_partner(partner_id: int, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE partners
                SET is_active = false
                WHERE id = %s
                """,
                (partner_id,)
            )

    return {"ok": True}


@app.get("/partners/{partner_id}")
def get_partner(
    partner_id: int,
    token: str = "",
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, category, subtype, is_active, created_at,
                       access_token, siret, phone, phone_type, address
                FROM partners
                WHERE id = %s
            """, (partner_id,))
            partner = cur.fetchone()

            if not partner:
                return {"error": "not_found"}

            is_admin = is_valid_admin_key(x_admin_key)
            has_partner_token = token and verify_partner_token(partner_id, token)

            if not is_admin and not has_partner_token:
                raise HTTPException(status_code=401, detail="unauthorized")

            if not is_admin:
                partner.pop("access_token", None)

    return partner


@app.get("/partners/{partner_id}/requests")
def get_partner_requests(
    partner_id: int,
    token: str = "",
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
):
    is_admin = is_valid_admin_key(x_admin_key)
    has_partner_token = token and verify_partner_token(partner_id, token)

    if not is_admin and not has_partner_token:
        raise HTTPException(status_code=401, detail="unauthorized")

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    r.id,
                    r.phone,
                    r.transcription,
                    r.category,
                    r.subtype,
                    r.status,
                    r.created_at,
                    r.handled_at,
                    r.client_id,
                    c.first_name,
                    c.last_name,
                    c.address
                FROM requests r
                LEFT JOIN clients c ON r.client_id = c.id
                WHERE r.assigned_partner_id = %s
                  AND r.archived = false
                ORDER BY r.created_at ASC
            """, (partner_id,))
            rows = cur.fetchall()

    return rows


# =========================
# CLIENTS
# =========================

@app.get("/clients")
def get_clients(_admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    c.id,
                    c.phone,
                    c.first_name,
                    c.last_name,
                    c.address,
                    c.created_at,
                    c.updated_at,
                    COUNT(r.id) AS total_requests,
                    MAX(r.created_at) AS last_request_at
                FROM clients c
                LEFT JOIN requests r ON r.client_id = c.id
                GROUP BY
                    c.id,
                    c.phone,
                    c.first_name,
                    c.last_name,
                    c.address,
                    c.created_at,
                    c.updated_at
                ORDER BY COALESCE(MAX(r.created_at), c.updated_at) DESC
            """)
            return cur.fetchall()


@app.get("/clients/{client_id}")
def get_client_detail(client_id: int, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    id,
                    phone,
                    first_name,
                    last_name,
                    address,
                    created_at,
                    updated_at
                FROM clients
                WHERE id = %s
            """, (client_id,))
            client_row = cur.fetchone()

            if not client_row:
                return {"error": "not_found"}

            cur.execute("""
                SELECT
                    r.id,
                    r.phone,
                    r.transcription,
                    r.category,
                    r.subtype,
                    r.status,
                    r.created_at,
                    r.handled_at,
                    r.assigned_partner_id,
                    p.name AS partner_name
                FROM requests r
                LEFT JOIN partners p ON r.assigned_partner_id = p.id
                WHERE r.client_id = %s
                ORDER BY r.created_at DESC
            """, (client_id,))
            requests_rows = cur.fetchall()

    return {
        "client": client_row,
        "requests": requests_rows
    }


@app.patch("/clients/{client_id}")
def update_client(client_id: int, payload: ClientUpdate, _admin=Depends(require_admin)):
    fields = []
    values = []

    if payload.first_name is not None:
        fields.append("first_name = %s")
        values.append(payload.first_name.strip() or None)

    if payload.last_name is not None:
        fields.append("last_name = %s")
        values.append(payload.last_name.strip() or None)

    if payload.address is not None:
        fields.append("address = %s")
        values.append(payload.address.strip() or None)

    if not fields:
        return {"error": "no_fields"}

    fields.append("updated_at = NOW()")
    values.append(client_id)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE clients
                SET {", ".join(fields)}
                WHERE id = %s
                RETURNING id, phone, first_name, last_name, address, created_at, updated_at
                """,
                values,
            )
            row = cur.fetchone()

            if not row:
                return {"error": "not_found"}

    return {"ok": True, "client": row}


@app.patch("/partners/{partner_id}")
def update_partner(partner_id: int, payload: PartnerUpdate, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, siret, phone, phone_type, category, subtype, address, is_active
                FROM partners
                WHERE id = %s
                """,
                (partner_id,),
            )
            existing = cur.fetchone()

            if not existing:
                return {"error": "not_found"}

            category = (
                payload.category.strip().lower()
                if payload.category is not None
                else existing["category"]
            )
            subtype = (
                payload.subtype.strip().lower()
                if payload.subtype is not None
                else existing["subtype"]
            )

            if payload.category is not None or payload.subtype is not None:
                valid, error = validate_category_subtype(category, subtype)
                if not valid:
                    return {"ok": False, "error": error}

            fields = []
            values = []

            if payload.name is not None:
                fields.append("name = %s")
                values.append(payload.name.strip())

            if payload.siret is not None:
                fields.append("siret = %s")
                values.append(payload.siret.strip())

            if payload.phone is not None:
                normalized_phone = normalize_french_phone(payload.phone)
                fields.append("phone = %s")
                values.append(normalized_phone)
                fields.append("phone_type = %s")
                values.append(get_phone_type(payload.phone))

            if payload.category is not None:
                fields.append("category = %s")
                values.append(category)

            if payload.subtype is not None:
                fields.append("subtype = %s")
                values.append(subtype)

            if payload.address is not None:
                fields.append("address = %s")
                values.append(payload.address.strip())

            if not fields:
                return {"error": "no_fields"}

            values.append(partner_id)

            cur.execute(
                f"""
                UPDATE partners
                SET {", ".join(fields)}
                WHERE id = %s
                RETURNING id, name, siret, phone, phone_type, category, subtype, address, is_active, access_token, created_at
                """,
                values,
            )
            row = cur.fetchone()

    return {"ok": True, "partner": row}