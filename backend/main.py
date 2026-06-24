from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Body
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor, Json
from openai import OpenAI
from twilio.rest import Client as TwilioClient
from typing import Any, Optional
from datetime import datetime, timezone

import os
import json
import re
import secrets
import requests

from auth import (
    is_valid_admin_key,
    parse_commune_id_header,
    partner_can_update_request,
    require_admin,
    verify_partner_token,
)
from communes import (
    build_partner_validation_payload,
    format_partner_full_address,
    get_commune_by_id,
    get_default_commune_id,
    is_valid_email,
    resolve_commune_id_for_partner,
    resolve_commune_id_for_request,
    resolve_commune_id_from_inbound_phone,
)
from db import ensure_schema, get_db_connection
from partner_validation import validate_partner_application
from taxonomy import (
    PARTNER_CATEGORIES,
    build_subtype_classification_prompt,
    normalize_partner_subtype,
    normalize_request_subtype,
    validate_mairie_service,
    validate_partner_category_subtype,
)


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

CLIENT_SELECT_FIELDS = """
    c.id,
    c.phone,
    c.first_name,
    c.last_name,
    c.address,
    c.email,
    c.opt_in_email,
    c.opt_in_sms,
    c.opt_in_email_at,
    c.opt_in_sms_at,
    c.commune_id,
    cm.name AS commune_name,
    c.created_at,
    c.updated_at
"""


def parse_optional_timestamp(raw: Optional[str]) -> Optional[datetime]:
    if raw is None:
        return None

    text = raw.strip()
    if not text:
        return None

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)

    return parsed


class PartnerCreate(BaseModel):
    name: str = Field(..., min_length=2)
    siret: str = Field(..., min_length=9)
    phone: str = Field(..., min_length=8)
    category: str = Field(..., min_length=2)
    subtype: str = Field(..., min_length=2)
    address: str = Field(..., min_length=3)
    postal_code: str = Field(..., min_length=4)
    city: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    commune_id: Optional[int] = None
    email: Optional[str] = None
    opt_in_email: Optional[bool] = None
    opt_in_sms: Optional[bool] = None
    opt_in_email_at: Optional[str] = None
    opt_in_sms_at: Optional[str] = None


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    siret: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    subtype: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    commune_id: Optional[int] = None


class CommuneCreate(BaseModel):
    name: str = Field(..., min_length=2)
    postal_code: str = Field(..., min_length=4)
    department_code: Optional[str] = None
    department_label: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    insee_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CommuneUpdate(BaseModel):
    name: Optional[str] = None
    postal_code: Optional[str] = None
    department_code: Optional[str] = None
    department_label: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    insee_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None


# =========================
# HELPERS
# =========================

def resolve_scope_commune_id(
    query_commune_id: Optional[int],
    header_commune_id: Optional[int],
) -> Optional[int]:
    if header_commune_id is not None:
        return header_commune_id
    return query_commune_id


def assert_request_commune_access(
    cur, request_id: int, commune_id: Optional[int]
):
    if commune_id is None:
        return

    cur.execute(
        "SELECT commune_id FROM requests WHERE id = %s",
        (request_id,),
    )
    row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="not_found")

    if row["commune_id"] != commune_id:
        raise HTTPException(status_code=403, detail="forbidden_commune")


def persist_partner_validation(cur, partner: dict, validation: dict):
    if partner["is_active"]:
        validation_status = "admin_validated"
        is_active = True
        set_validated_at = True
    else:
        validation_status = validation["validation_status"]
        is_active = validation["is_active"]
        set_validated_at = validation["auto_approved"]

    canonical = validation.get("canonical_fields") or {}
    if validation_status == "rejected":
        canonical = {}

    set_clauses = [
        "validation_status = %s",
        "validation_confidence = %s",
        "validation_report = %s",
        "sirene_snapshot = %s",
        "is_active = %s",
        "validated_at = CASE WHEN %s THEN NOW() ELSE validated_at END",
    ]
    params: list[Any] = [
        validation_status,
        validation["validation_confidence"],
        Json(validation["validation_report"]),
        Json(validation["sirene_snapshot"]),
        is_active,
        set_validated_at,
    ]

    if canonical.get("name"):
        set_clauses.append("name = %s")
        params.append(canonical["name"])
    if canonical.get("address"):
        set_clauses.append("address = %s")
        params.append(canonical["address"])
    if canonical.get("postal_code"):
        set_clauses.append("postal_code = %s")
        params.append(canonical["postal_code"])
    if canonical.get("city"):
        set_clauses.append("city = %s")
        params.append(canonical["city"])
    if canonical:
        commune_id = resolve_commune_id_for_partner(
            canonical.get("address") or partner.get("address") or "",
            postal_code=canonical.get("postal_code") or partner.get("postal_code"),
        )
        if commune_id is not None:
            set_clauses.append("commune_id = %s")
            params.append(commune_id)

    params.append(partner["id"])

    cur.execute(
        f"""
        UPDATE partners
        SET
            {", ".join(set_clauses)}
        WHERE id = %s
        RETURNING
            id,
            name,
            access_token,
            is_active,
            validation_status,
            validation_confidence,
            validation_report,
            sirene_snapshot,
            validated_at
        """,
        tuple(params),
    )
    return cur.fetchone()

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
- transport : déplacement, taxi, VTC, trajet
- commerce : achat d'un produit, commande ou rendez-vous chez un commerçant local
- service_local : prestation d'un professionnel, artisan, travaux, réparation à domicile
- mairie : problème sur la voie publique, service public, demande administrative ou signalement communal
- autre

Demande : {message_text}

Réponds uniquement par le nom exact de la catégorie.
"""
    )
    return result.output_text.strip().lower()


def classify_subtype(category: str, message_text: str):
    prompt = build_subtype_classification_prompt(category, message_text)

    if category.strip().lower() == "transport":
        return "taxi"

    if prompt == "autre":
        return "autre"

    result = client.responses.create(
        model="gpt-4o-mini",
        input=prompt,
    )
    raw = result.output_text.strip().lower()
    return normalize_request_subtype(category, raw)


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


def upsert_client(
    phone: str,
    message_text: str,
    commune_id: Optional[int] = None,
):
    normalized_phone = normalize_french_phone(phone)
    info = extract_client_info(message_text)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO clients (
                    phone, first_name, last_name, address, commune_id, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (phone)
                DO UPDATE SET
                    first_name = COALESCE(EXCLUDED.first_name, clients.first_name),
                    last_name = COALESCE(EXCLUDED.last_name, clients.last_name),
                    address = COALESCE(EXCLUDED.address, clients.address),
                    commune_id = COALESCE(EXCLUDED.commune_id, clients.commune_id),
                    updated_at = NOW()
                RETURNING id
            """, (
                normalized_phone,
                info.get("first_name"),
                info.get("last_name"),
                info.get("address"),
                commune_id,
            ))

            row = cur.fetchone()

    return row["id"]


def create_request_from_message(
    phone: str,
    message_text: str,
    inbound_to: Optional[str] = None,
):
    normalized_phone = normalize_french_phone(phone)
    category = classify_category(message_text)
    subtype = classify_subtype(category, message_text)
    client_info = extract_client_info(message_text)
    commune_id = (
        resolve_commune_id_from_inbound_phone(inbound_to)
        or resolve_commune_id_for_request(client_info.get("address") or message_text)
    )
    client_id = upsert_client(normalized_phone, message_text, commune_id)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO requests (
                    phone, transcription, category, subtype, client_id, commune_id
                )
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                normalized_phone,
                message_text,
                category,
                subtype,
                client_id,
                commune_id,
            ))

    return {
        "phone": normalized_phone,
        "transcription": message_text,
        "category": category,
        "subtype": subtype,
        "client_id": client_id,
        "commune_id": commune_id,
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


@app.on_event("startup")
def startup():
    ensure_schema()


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
    called = form.get("To")

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

    create_request_from_message(caller, transcript.text, inbound_to=called)

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
    recipient = form.get("To")
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

    create_request_from_message(phone, message_body, inbound_to=recipient)

    return Response(
        content="""
        <Response>
            <Message>Merci, votre demande a bien été enregistrée.</Message>
        </Response>
        """,
        media_type="application/xml"
    )


# =========================
# COMMUNES
# =========================

@app.get("/communes/active")
def get_active_communes():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, postal_code
                FROM communes
                WHERE is_active = true
                ORDER BY name ASC
                """
            )
            return cur.fetchall()


@app.get("/communes")
def get_communes(_admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    cm.id,
                    cm.name,
                    cm.postal_code,
                    cm.department_code,
                    cm.department_label,
                    cm.email,
                    cm.phone,
                    cm.insee_code,
                    cm.latitude,
                    cm.longitude,
                    cm.is_active,
                    cm.created_at,
                    COUNT(DISTINCT r.id) AS total_requests,
                    COUNT(DISTINCT CASE
                        WHEN r.archived = false
                         AND r.status IN ('new', 'in_progress')
                        THEN r.id
                    END) AS active_requests,
                    COUNT(DISTINCT p.id) AS partners_count
                FROM communes cm
                LEFT JOIN requests r ON r.commune_id = cm.id
                LEFT JOIN partners p ON p.commune_id = cm.id AND p.category <> 'mairie'
                GROUP BY
                    cm.id,
                    cm.name,
                    cm.postal_code,
                    cm.department_code,
                    cm.department_label,
                    cm.email,
                    cm.phone,
                    cm.insee_code,
                    cm.latitude,
                    cm.longitude,
                    cm.is_active,
                    cm.created_at
                ORDER BY cm.name ASC
                """
            )
            return cur.fetchall()


@app.post("/communes")
def create_commune(payload: CommuneCreate, _admin=Depends(require_admin)):
    normalized_phone = (
        normalize_french_phone(payload.phone) if payload.phone else None
    )
    email = payload.email.strip() if payload.email else None
    department_code = (
        payload.department_code.strip().upper() if payload.department_code else None
    )
    department_label = (
        payload.department_label.strip() if payload.department_label else None
    )
    insee_code = payload.insee_code.strip() if payload.insee_code else None

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO communes (
                    name,
                    postal_code,
                    department_code,
                    department_label,
                    email,
                    phone,
                    insee_code,
                    latitude,
                    longitude,
                    is_active
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true)
                RETURNING
                    id,
                    name,
                    postal_code,
                    department_code,
                    department_label,
                    email,
                    phone,
                    insee_code,
                    latitude,
                    longitude,
                    is_active,
                    created_at
                """,
                (
                    payload.name.strip(),
                    payload.postal_code.strip(),
                    department_code,
                    department_label,
                    email or None,
                    normalized_phone,
                    insee_code or None,
                    payload.latitude,
                    payload.longitude,
                ),
            )
            row = cur.fetchone()

    return {"ok": True, "commune": row}


@app.patch("/communes/{commune_id}")
def update_commune(
    commune_id: int, payload: CommuneUpdate, _admin=Depends(require_admin)
):
    fields = []
    values = []

    if payload.name is not None:
        fields.append("name = %s")
        values.append(payload.name.strip())

    if payload.postal_code is not None:
        fields.append("postal_code = %s")
        values.append(payload.postal_code.strip())

    if payload.department_code is not None:
        fields.append("department_code = %s")
        values.append(payload.department_code.strip().upper() or None)

    if payload.department_label is not None:
        fields.append("department_label = %s")
        values.append(payload.department_label.strip() or None)

    if payload.email is not None:
        fields.append("email = %s")
        values.append(payload.email.strip() or None)

    if payload.phone is not None:
        fields.append("phone = %s")
        values.append(
            normalize_french_phone(payload.phone) if payload.phone.strip() else None
        )

    if payload.insee_code is not None:
        fields.append("insee_code = %s")
        values.append(payload.insee_code.strip() or None)

    if payload.latitude is not None:
        fields.append("latitude = %s")
        values.append(payload.latitude)

    if payload.longitude is not None:
        fields.append("longitude = %s")
        values.append(payload.longitude)

    if payload.is_active is not None:
        fields.append("is_active = %s")
        values.append(payload.is_active)

    if not fields:
        return {"error": "no_fields"}

    values.append(commune_id)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE communes
                SET {", ".join(fields)}
                WHERE id = %s
                RETURNING
                    id,
                    name,
                    postal_code,
                    department_code,
                    department_label,
                    email,
                    phone,
                    insee_code,
                    latitude,
                    longitude,
                    is_active,
                    created_at
                """,
                values,
            )
            row = cur.fetchone()

            if not row:
                return {"error": "not_found"}

    return {"ok": True, "commune": row}


# =========================
# REQUESTS
# =========================

@app.get("/requests")
def get_requests(
    archived: bool = Query(False),
    commune_id: Optional[int] = Query(None),
    header_commune_id: Optional[int] = Depends(parse_commune_id_header),
    _admin=Depends(require_admin),
):
    scope_commune_id = resolve_scope_commune_id(commune_id, header_commune_id)
    order = "DESC" if archived else "ASC"
    filters = ["r.archived = %s"]
    params: list = [archived]

    if scope_commune_id is not None:
        filters.append("r.commune_id = %s")
        params.append(scope_commune_id)

    where_clause = " AND ".join(filters)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT 
                    r.id,
                    r.phone,
                    r.transcription,
                    r.category,
                    r.subtype,
                    r.status,
                    r.assigned_partner_id,
                    r.assigned_service,
                    r.commune_id,
                    cm.name AS commune_name,
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
                LEFT JOIN communes cm ON r.commune_id = cm.id
                WHERE {where_clause}
                ORDER BY r.created_at {order}
                """,
                params,
            )
            rows = cur.fetchall()

    return rows


@app.post("/requests/{request_id}/status")
def update_status(
    request_id: int,
    status: str = Body(...),
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
    x_partner_token: Optional[str] = Header(default=None, alias="X-Partner-Token"),
    x_partner_id: Optional[str] = Header(default=None, alias="X-Partner-Id"),
    header_commune_id: Optional[int] = Depends(parse_commune_id_header),
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
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if is_admin and header_commune_id is not None:
                assert_request_commune_access(cur, request_id, header_commune_id)

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
def archive_request(
    request_id: int,
    header_commune_id: Optional[int] = Depends(parse_commune_id_header),
    _admin=Depends(require_admin),
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            assert_request_commune_access(cur, request_id, header_commune_id)
            cur.execute(
                "UPDATE requests SET archived = true WHERE id = %s",
                (request_id,),
            )

    return {"ok": True}


@app.post("/requests/{request_id}/assign-service")
def assign_request_service(
    request_id: int,
    payload: dict = Body(...),
    header_commune_id: Optional[int] = Depends(parse_commune_id_header),
    _admin=Depends(require_admin),
):
    service = payload.get("service", "").strip().lower()
    valid, error = validate_mairie_service(service)
    if not valid:
        return {"error": error}

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            assert_request_commune_access(cur, request_id, header_commune_id)
            cur.execute(
                """
                SELECT id, category
                FROM requests
                WHERE id = %s
                """,
                (request_id,),
            )
            req = cur.fetchone()

            if not req:
                return {"error": "not_found"}

            if req["category"].strip().lower() != "mairie":
                return {"error": "not_mairie_request"}

            cur.execute(
                """
                UPDATE requests
                SET assigned_to = %s,
                    assigned_service = %s,
                    subtype = %s,
                    assigned_partner_id = NULL
                WHERE id = %s
                RETURNING id, assigned_service, subtype
                """,
                ("service", service, service, request_id),
            )
            row = cur.fetchone()

    return {"ok": True, "assigned_service": row["assigned_service"]}


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

            if req["category"].strip().lower() == "mairie":
                return {"error": "use_assign_service"}

            if not partner["is_active"]:
                return {"error": "partner_inactive"}

            cur.execute("""
                UPDATE requests
                SET assigned_to = %s,
                    assigned_partner_id = %s,
                    assigned_service = NULL
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
def get_partners(
    commune_id: Optional[int] = Query(None),
    header_commune_id: Optional[int] = Depends(parse_commune_id_header),
    _admin=Depends(require_admin),
):
    scope_commune_id = resolve_scope_commune_id(commune_id, header_commune_id)
    filters = ["p.category <> 'mairie'"]
    params: list = []

    if scope_commune_id is not None:
        filters.append("p.commune_id = %s")
        params.append(scope_commune_id)

    where_clause = " AND ".join(filters)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
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
                    p.postal_code,
                    p.city,
                    p.email,
                    p.commune_id,
                    p.validation_status,
                    p.validation_confidence,
                    p.validation_report,
                    p.sirene_snapshot,
                    p.validated_at,
                    cm.name AS commune_name,
                    COUNT(r.id) AS assigned_requests_count
                FROM partners p
                LEFT JOIN communes cm ON p.commune_id = cm.id
                LEFT JOIN requests r
                    ON r.assigned_partner_id = p.id
                    AND r.archived = false
                WHERE {where_clause}
                GROUP BY
                    p.id,
                    p.name,
                    p.category,
                    p.subtype,
                    p.is_active,
                    p.siret,
                    p.phone,
                    p.phone_type,
                    p.address,
                    p.postal_code,
                    p.city,
                    p.email,
                    p.commune_id,
                    p.validation_status,
                    p.validation_confidence,
                    p.validation_report,
                    p.sirene_snapshot,
                    p.validated_at,
                    cm.name
                ORDER BY p.is_active ASC, p.name ASC
                """,
                params,
            )
            rows = cur.fetchall()

    return rows


@app.post("/partners/apply")
def create_partner_application(partner: PartnerCreate):
    category = partner.category.strip().lower()
    subtype = normalize_partner_subtype(category, partner.subtype.strip().lower())

    if category not in PARTNER_CATEGORIES:
        return {"ok": False, "error": "invalid_category"}

    valid, error = validate_partner_category_subtype(category, subtype)
    if not valid:
        return {"ok": False, "error": error}

    normalized_phone = normalize_french_phone(partner.phone)
    phone_type = get_phone_type(partner.phone)
    access_token = secrets.token_urlsafe(32)
    postal_code = re.sub(r"\D", "", partner.postal_code.strip())
    city = partner.city.strip()
    email = partner.email.strip().lower()

    if len(postal_code) != 5:
        return {"ok": False, "error": "invalid_postal_code"}

    if not is_valid_email(email):
        return {"ok": False, "error": "invalid_email"}

    commune_id = resolve_commune_id_for_partner(
        partner.address.strip(),
        postal_code=postal_code,
    )
    siret_digits = re.sub(r"\D", "", partner.siret.strip())
    if len(siret_digits) not in (9, 14):
        return {"ok": False, "error": "invalid_siret"}

    partner_row = {
        "name": partner.name.strip(),
        "siret": partner.siret.strip(),
        "phone": normalized_phone,
        "category": category,
        "subtype": subtype,
        "address": partner.address.strip(),
        "postal_code": postal_code,
        "city": city,
        "email": email,
    }
    partner_payload = build_partner_validation_payload(partner_row)

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
                    postal_code,
                    city,
                    email,
                    commune_id,
                    is_active,
                    access_token,
                    validation_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false, %s, 'pending')
                RETURNING id, name, access_token, is_active
            """, (
                partner_row["name"],
                partner_row["siret"],
                normalized_phone,
                phone_type,
                category,
                subtype,
                partner_row["address"],
                postal_code,
                city,
                email,
                commune_id,
                access_token,
            ))

            new_partner = cur.fetchone()
            partner_id = new_partner["id"]

            validation = validate_partner_application(partner_payload)
            partner_row["id"] = partner_id
            partner_row["is_active"] = False
            new_partner = persist_partner_validation(cur, partner_row, validation)

    return {
        "ok": True,
        "partner": new_partner,
        "validation": {
            "status": validation["validation_status"],
            "confidence": validation["validation_confidence"],
            "auto_approved": validation["auto_approved"],
            "summary": validation["validation_report"].get("summary"),
        },
    }


@app.post("/partners/{partner_id}/activate")
def activate_partner(partner_id: int, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE partners
                SET is_active = true,
                    validation_status = 'admin_validated',
                    validated_at = NOW()
                WHERE id = %s
                """,
                (partner_id,),
            )

    return {"ok": True}


@app.post("/partners/{partner_id}/confirm-validation")
def confirm_partner_validation(partner_id: int, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, validation_status, is_active
                FROM partners
                WHERE id = %s
                """,
                (partner_id,),
            )
            partner = cur.fetchone()

            if not partner:
                return {"ok": False, "error": "not_found"}

            if partner["validation_status"] not in ("needs_review", "rejected", "pending"):
                return {
                    "ok": False,
                    "error": "invalid_status",
                    "detail": "Ce partenaire ne nécessite pas de confirmation admin.",
                }

            cur.execute(
                """
                UPDATE partners
                SET is_active = true,
                    validation_status = 'admin_validated',
                    validated_at = NOW()
                WHERE id = %s
                RETURNING id, name, is_active, validation_status, validated_at
                """,
                (partner_id,),
            )
            row = cur.fetchone()

    return {"ok": True, "partner": row}


@app.post("/partners/{partner_id}/revalidate")
def revalidate_partner(partner_id: int, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, siret, phone, category, subtype, address, postal_code, city, email, is_active
                FROM partners
                WHERE id = %s
                """,
                (partner_id,),
            )
            partner = cur.fetchone()

            if not partner:
                return {"ok": False, "error": "not_found"}

            validation = validate_partner_application(
                build_partner_validation_payload(partner)
            )
            row = persist_partner_validation(cur, partner, validation)

    return {"ok": True, "partner": row, "validation": validation}


@app.post("/partners/revalidate-pending")
def revalidate_pending_partners(_admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, siret, phone, category, subtype, address, postal_code, city, email, is_active
                FROM partners
                WHERE validation_report IS NULL
                   OR (
                       validation_status = 'pending'
                       AND validation_confidence IS NULL
                   )
                ORDER BY id ASC
                """
            )
            partners = cur.fetchall()

            updated = []
            for partner in partners:
                validation = validate_partner_application(
                    build_partner_validation_payload(partner)
                )
                row = persist_partner_validation(cur, partner, validation)
                updated.append(
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "validation_status": row["validation_status"],
                        "validation_confidence": row["validation_confidence"],
                    }
                )

        conn.commit()

    return {"ok": True, "processed": len(updated), "partners": updated}


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
                       access_token, siret, phone, phone_type, address,
                       postal_code, city, email, commune_id
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
# CONTACTS (table clients)
# =========================

@app.get("/clients")
@app.get("/contacts")
def get_clients(
    commune_id: Optional[int] = Query(None),
    header_commune_id: Optional[int] = Depends(parse_commune_id_header),
    _admin=Depends(require_admin),
):
    scope_commune_id = resolve_scope_commune_id(commune_id, header_commune_id)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if scope_commune_id is None:
                cur.execute(f"""
                    SELECT
                        {CLIENT_SELECT_FIELDS},
                        COUNT(r.id) AS total_requests,
                        MAX(r.created_at) AS last_request_at
                    FROM clients c
                    LEFT JOIN communes cm ON c.commune_id = cm.id
                    LEFT JOIN requests r ON r.client_id = c.id
                    GROUP BY
                        c.id,
                        c.phone,
                        c.first_name,
                        c.last_name,
                        c.address,
                        c.email,
                        c.opt_in_email,
                        c.opt_in_sms,
                        c.opt_in_email_at,
                        c.opt_in_sms_at,
                        c.commune_id,
                        cm.name,
                        c.created_at,
                        c.updated_at
                    ORDER BY COALESCE(MAX(r.created_at), c.updated_at) DESC
                """)
            else:
                cur.execute(
                    f"""
                    SELECT
                        {CLIENT_SELECT_FIELDS},
                        COUNT(r.id) AS total_requests,
                        MAX(r.created_at) AS last_request_at
                    FROM clients c
                    LEFT JOIN communes cm ON c.commune_id = cm.id
                    LEFT JOIN requests r ON r.client_id = c.id
                        AND r.commune_id = %s
                    WHERE c.commune_id = %s
                       OR (
                           c.commune_id IS NULL
                           AND EXISTS (
                               SELECT 1
                               FROM requests r2
                               WHERE r2.client_id = c.id
                                 AND r2.commune_id = %s
                           )
                       )
                    GROUP BY
                        c.id,
                        c.phone,
                        c.first_name,
                        c.last_name,
                        c.address,
                        c.email,
                        c.opt_in_email,
                        c.opt_in_sms,
                        c.opt_in_email_at,
                        c.opt_in_sms_at,
                        c.commune_id,
                        cm.name,
                        c.created_at,
                        c.updated_at
                    ORDER BY COALESCE(MAX(r.created_at), c.updated_at) DESC
                    """,
                    (scope_commune_id, scope_commune_id, scope_commune_id),
                )
            return cur.fetchall()


@app.get("/clients/{client_id}")
@app.get("/contacts/{client_id}")
def get_client_detail(
    client_id: int,
    header_commune_id: Optional[int] = Depends(parse_commune_id_header),
    _admin=Depends(require_admin),
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"""
                SELECT
                    {CLIENT_SELECT_FIELDS}
                FROM clients c
                LEFT JOIN communes cm ON c.commune_id = cm.id
                WHERE c.id = %s
            """, (client_id,))
            client_row = cur.fetchone()

            if not client_row:
                return {"error": "not_found"}

            if header_commune_id is not None:
                if client_row.get("commune_id") != header_commune_id:
                    cur.execute(
                        """
                        SELECT 1
                        FROM requests
                        WHERE client_id = %s AND commune_id = %s
                        LIMIT 1
                        """,
                        (client_id, header_commune_id),
                    )
                    if not cur.fetchone():
                        return {"error": "not_found"}

                cur.execute(
                    """
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
                        r.assigned_service,
                        p.name AS partner_name
                    FROM requests r
                    LEFT JOIN partners p ON r.assigned_partner_id = p.id
                    WHERE r.client_id = %s AND r.commune_id = %s
                    ORDER BY r.created_at DESC
                    """,
                    (client_id, header_commune_id),
                )
            else:
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
                        r.assigned_service,
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
@app.patch("/contacts/{client_id}")
def update_client(client_id: int, payload: ClientUpdate, _admin=Depends(require_admin)):
    updates = payload.model_dump(exclude_unset=True)
    fields = []
    values = []

    if "first_name" in updates:
        fields.append("first_name = %s")
        values.append((updates["first_name"] or "").strip() or None)

    if "last_name" in updates:
        fields.append("last_name = %s")
        values.append((updates["last_name"] or "").strip() or None)

    if "address" in updates:
        fields.append("address = %s")
        values.append((updates["address"] or "").strip() or None)

    if "commune_id" in updates:
        commune_id = updates["commune_id"]
        if commune_id is not None:
            commune = get_commune_by_id(commune_id)
            if not commune:
                return {"error": "invalid_commune"}
        fields.append("commune_id = %s")
        values.append(commune_id)

    if "email" in updates:
        email = (updates["email"] or "").strip().lower() or None
        if email and not is_valid_email(email):
            return {"error": "invalid_email"}
        fields.append("email = %s")
        values.append(email)

    if "opt_in_email" in updates:
        fields.append("opt_in_email = %s")
        values.append(bool(updates["opt_in_email"]))

    if "opt_in_sms" in updates:
        fields.append("opt_in_sms = %s")
        values.append(bool(updates["opt_in_sms"]))

    if "opt_in_email_at" in updates:
        fields.append("opt_in_email_at = %s")
        values.append(parse_optional_timestamp(updates["opt_in_email_at"]))

    if "opt_in_sms_at" in updates:
        fields.append("opt_in_sms_at = %s")
        values.append(parse_optional_timestamp(updates["opt_in_sms_at"]))

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
                RETURNING
                    id,
                    phone,
                    first_name,
                    last_name,
                    address,
                    email,
                    opt_in_email,
                    opt_in_sms,
                    opt_in_email_at,
                    opt_in_sms_at,
                    commune_id,
                    created_at,
                    updated_at
                """,
                values,
            )
            row = cur.fetchone()

            if not row:
                return {"error": "not_found"}

            if row.get("commune_id"):
                cur.execute(
                    "SELECT name FROM communes WHERE id = %s",
                    (row["commune_id"],),
                )
                commune_row = cur.fetchone()
                if commune_row:
                    row["commune_name"] = commune_row["name"]

    return {"ok": True, "client": row}


@app.patch("/partners/{partner_id}")
def update_partner(partner_id: int, payload: PartnerUpdate, _admin=Depends(require_admin)):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, name, siret, phone, phone_type, category, subtype,
                       address, postal_code, city, email, is_active
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
                normalize_partner_subtype(category, payload.subtype.strip().lower())
                if payload.subtype is not None
                else existing["subtype"]
            )

            if payload.category is not None or payload.subtype is not None:
                valid, error = validate_partner_category_subtype(category, subtype)
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

            if payload.postal_code is not None:
                fields.append("postal_code = %s")
                values.append(re.sub(r"\D", "", payload.postal_code.strip()))

            if payload.city is not None:
                fields.append("city = %s")
                values.append(payload.city.strip())

            if payload.email is not None:
                email = payload.email.strip().lower()
                if not is_valid_email(email):
                    return {"ok": False, "error": "invalid_email"}
                fields.append("email = %s")
                values.append(email)

            if payload.commune_id is not None:
                commune = get_commune_by_id(payload.commune_id)
                if not commune:
                    return {"ok": False, "error": "invalid_commune"}
                fields.append("commune_id = %s")
                values.append(payload.commune_id)
            elif payload.postal_code is not None or payload.address is not None:
                resolved_commune_id = resolve_commune_id_for_partner(
                    (payload.address or existing["address"] or "").strip(),
                    postal_code=(
                        re.sub(r"\D", "", payload.postal_code.strip())
                        if payload.postal_code is not None
                        else existing.get("postal_code")
                    ),
                )
                if resolved_commune_id is not None:
                    fields.append("commune_id = %s")
                    values.append(resolved_commune_id)

            if not fields:
                return {"error": "no_fields"}

            values.append(partner_id)

            cur.execute(
                f"""
                UPDATE partners
                SET {", ".join(fields)}
                WHERE id = %s
                RETURNING id, name, siret, phone, phone_type, category, subtype,
                          address, postal_code, city, email, commune_id, is_active,
                          access_token, created_at
                """,
                values,
            )
            row = cur.fetchone()

    return {"ok": True, "partner": row}