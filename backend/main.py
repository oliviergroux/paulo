from fastapi import FastAPI, Request, Body
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor
from openai import OpenAI
from twilio.rest import Client as TwilioClient
import psycopg2
import requests
import os
import secrets

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

twilio_client = TwilioClient(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

TWILIO_FROM_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
APP_URL = os.getenv("APP_URL", "https://paulo-teal-nine.vercel.app")


class PartnerCreate(BaseModel):
    name: str = Field(..., min_length=2)
    siret: str = Field(..., min_length=9)
    phone: str = Field(..., min_length=8)
    category: str = Field(..., min_length=2)
    subtype: str = Field(..., min_length=2)
    address: str = Field(..., min_length=5)


def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"), sslmode="require")


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


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Paulo API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/twilio/voice")
async def twilio_voice(request: Request):
    twiml = """
    <Response>
        <Say language="fr-FR" voice="alice">
            Bonjour, vous êtes sur Paulo. Expliquez votre demande après le bip.
        </Say>
        <Record 
            maxLength="120" 
            playBeep="true"
            action="https://paulo-backend.onrender.com/twilio/recording"
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

    category = client.responses.create(
        model="gpt-4o-mini",
        input=f"""
Classe cette demande dans UNE seule catégorie parmi :
- transport : déplacement, taxi, trajet
- commerce : achat d’un produit ou rdv coiffeur
- service_local : prestation d’un professionnel
- mairie : demande administrative, information ou problème dans la commune
- autre

Demande : {transcript.text}

Réponds uniquement par le nom exact de la catégorie.
"""
    )

    subtype = client.responses.create(
        model="gpt-4o-mini",
        input=f"""
Tu dois extraire un sous-type précis à partir de la demande.

Si category = commerce, réponds par un seul mot parmi :
- fleuriste
- boucher
- tabac_presse
- poste
- courses
- autre

Si category = service_local, réponds par un seul mot parmi :
- plombier
- jardinier
- maçon
- pisciniste
- petits_travaux
- autre

Si category = transport, réponds : taxi
Si category = mairie, réponds : mairie
Sinon réponds : autre

Category : {category.output_text}
Demande : {transcript.text}

Réponds uniquement par le sous-type exact.
"""
    )

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO requests (phone, transcription, category, subtype)
                VALUES (%s, %s, %s, %s)
                """,
                (caller, transcript.text, category.output_text, subtype.output_text)
            )

    return Response(
        content="""
        <Response>
            <Say>Merci, votre demande a bien été enregistrée.</Say>
        </Response>
        """,
        media_type="application/xml"
    )


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

    category = client.responses.create(
        model="gpt-4o-mini",
        input=f"""
Classe cette demande dans UNE seule catégorie parmi :
- transport : déplacement, taxi, trajet
- commerce : achat d’un produit ou rdv coiffeur
- service_local : prestation d’un professionnel
- mairie : demande administrative, information ou problème dans la commune
- autre

Demande : {message_body}

Réponds uniquement par le nom exact de la catégorie.
"""
    )

    subtype = client.responses.create(
        model="gpt-4o-mini",
        input=f"""
Tu dois extraire un sous-type précis à partir de la demande.

Si category = commerce, réponds par un seul mot parmi :
- fleuriste
- boucher
- tabac_presse
- poste
- courses
- autre

Si category = service_local, réponds par un seul mot parmi :
- plombier
- jardinier
- maçon
- pisciniste
- petits_travaux
- autre

Si category = transport, réponds : taxi
Si category = mairie, réponds : mairie
Sinon réponds : autre

Category : {category.output_text}
Demande : {message_body}

Réponds uniquement par le sous-type exact.
"""
    )

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO requests (phone, transcription, category, subtype)
                VALUES (%s, %s, %s, %s)
                """,
                (phone, message_body, category.output_text, subtype.output_text)
            )

    return Response(
        content="""
        <Response>
            <Message>Merci, votre demande a bien été enregistrée.</Message>
        </Response>
        """,
        media_type="application/xml"
    )


@app.get("/requests")
def get_requests():
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
                    r.archived
                FROM requests r
                LEFT JOIN partners p ON r.assigned_partner_id = p.id
                WHERE r.archived = false
                ORDER BY r.created_at ASC
            """)
            rows = cur.fetchall()

    return rows


@app.post("/requests/{request_id}/status")
def update_status(request_id: int, status: str = Body(...)):
    allowed_status = ["new", "in_progress", "done"]

    if status not in allowed_status:
        return {"error": "invalid status"}

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
def archive_request(request_id: int):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE requests SET archived = true WHERE id = %s",
                (request_id,)
            )

    return {"ok": True}


@app.get("/partners")
def get_partners():
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
                GROUP BY p.id, p.name, p.category, p.subtype, p.is_active, p.siret, p.phone, p.phone_type, p.address
                ORDER BY p.is_active ASC, p.name ASC
            """)
            rows = cur.fetchall()

    return rows


@app.post("/partners/apply")
def create_partner_application(partner: PartnerCreate):
    allowed_categories = ["commerce", "service_local", "transport", "mairie"]

    if partner.category not in allowed_categories:
        return {"ok": False, "error": "invalid_category"}

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
                RETURNING id, name
            """, (
                partner.name.strip(),
                partner.siret.strip(),
                normalized_phone,
                phone_type,
                partner.category.strip(),
                partner.subtype.strip(),
                partner.address.strip(),
                access_token
            ))

            new_partner = cur.fetchone()

    return {
        "ok": True,
        "partner": new_partner
    }


@app.post("/partners/{partner_id}/activate")
def activate_partner(partner_id: int):
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
def deactivate_partner(partner_id: int):
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


@app.post("/requests/{request_id}/assign")
def assign_request(request_id: int, payload: dict = Body(...)):
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
                SELECT id, phone, transcription, category, subtype
                FROM requests
                WHERE id = %s
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

    message = f"""Nouvelle demande Paulo 📩

{req['transcription']}

Catégorie : {req['category']} / {req['subtype']}
Contact client : {req['phone']}

Voir la demande :
{partner_url}
"""

    phone_type = partner["phone_type"] or get_phone_type(partner["phone"])

    if partner["phone"] and phone_type == "mobile":
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


@app.get("/partners/{partner_id}")
def get_partner(partner_id: int, token: str = ""):
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

            if token and partner["access_token"] != token:
                return {"error": "unauthorized"}

    return partner


@app.get("/partners/{partner_id}/requests")
def get_partner_requests(partner_id: int, token: str = ""):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if token:
                cur.execute("""
                    SELECT id, access_token
                    FROM partners
                    WHERE id = %s
                """, (partner_id,))
                partner = cur.fetchone()

                if not partner or partner["access_token"] != token:
                    return {"error": "unauthorized"}

            cur.execute("""
                SELECT id, phone, transcription, category, subtype, status,
                       created_at, handled_at
                FROM requests
                WHERE assigned_partner_id = %s
                  AND archived = false
                ORDER BY created_at ASC
            """, (partner_id,))
            rows = cur.fetchall()

    return rows