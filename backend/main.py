from fastapi import FastAPI, Request, Body
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

import os
import json
import requests
import psycopg2

from psycopg2.extras import RealDictCursor
from openai import OpenAI
from twilio.rest import Client as TwilioClient


# =========================
# CONFIG
# =========================

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

twilio_client = TwilioClient(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")


def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"), sslmode="require")


# =========================
# HELPERS
# =========================

def normalize_french_phone(phone: str):
    if not phone:
        return None

    phone = phone.replace(" ", "").replace(".", "")

    if phone.startswith("+33"):
        return phone

    if phone.startswith("0"):
        return "+33" + phone[1:]

    return phone


def get_phone_type(phone: str):
    if not phone:
        return "unknown"

    phone = phone.replace(" ", "")

    if phone.startswith("+336") or phone.startswith("+337"):
        return "mobile"

    if phone.startswith("+331") or phone.startswith("+332") or phone.startswith("+333") or phone.startswith("+334") or phone.startswith("+335"):
        return "landline"

    return "unknown"


def extract_client_info(message_text: str):
    try:
        result = client.responses.create(
            model="gpt-4o-mini",
            input=f"""
Extrait les informations client depuis cette demande.

Retourne uniquement du JSON valide :
{{
  "first_name": null,
  "last_name": null,
  "address": null
}}

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


# =========================
# VOICE FLOW
# =========================

@app.post("/twilio/voice")
async def twilio_voice():
    twiml = """
    <Response>
        <Say language="fr-FR" voice="alice">
            Bonjour, expliquez votre demande après le bip.
        </Say>
        <Record maxLength="120" playBeep="true"
            action="https://paulo-backend.onrender.com/twilio/recording"/>
    </Response>
    """
    return Response(content=twiml, media_type="application/xml")


@app.post("/twilio/recording")
async def recording(request: Request):
    form = await request.form()

    recording_url = form.get("RecordingUrl")
    caller = form.get("From")

    audio = requests.get(
        recording_url + ".wav",
        auth=(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    ).content

    with open("audio.wav", "wb") as f:
        f.write(audio)

    with open("audio.wav", "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=f
        )

    text = transcript.text

    category = client.responses.create(
        model="gpt-4o-mini",
        input=f"Classe la demande : {text}"
    )

    subtype = client.responses.create(
        model="gpt-4o-mini",
        input=f"Donne le sous-type : {text}"
    )

    client_id = upsert_client(caller, text)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO requests (phone, transcription, category, subtype, client_id)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                normalize_french_phone(caller),
                text,
                category.output_text,
                subtype.output_text,
                client_id
            ))

    return Response("<Response><Say>Merci</Say></Response>", media_type="application/xml")


# =========================
# WHATSAPP INBOUND
# =========================

@app.post("/twilio/whatsapp")
async def whatsapp_inbound(request: Request):
    form = await request.form()

    phone = form.get("From")
    message = form.get("Body")

    client_id = upsert_client(phone, message)

    category = client.responses.create(
        model="gpt-4o-mini",
        input=f"Classe la demande : {message}"
    )

    subtype = client.responses.create(
        model="gpt-4o-mini",
        input=f"Donne le sous-type : {message}"
    )

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO requests (phone, transcription, category, subtype, client_id)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                normalize_french_phone(phone),
                message,
                category.output_text,
                subtype.output_text,
                client_id
            ))

    return Response("<Response></Response>", media_type="application/xml")


# =========================
# GET REQUESTS
# =========================

@app.get("/requests")
def get_requests():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT r.*, 
                       p.name as partner_name,
                       c.first_name,
                       c.last_name,
                       c.address
                FROM requests r
                LEFT JOIN partners p ON r.assigned_partner_id = p.id
                LEFT JOIN clients c ON r.client_id = c.id
                WHERE r.archived = false
                ORDER BY r.created_at ASC
            """)
            return cur.fetchall()


# =========================
# STATUS / ASSIGN
# =========================

@app.post("/requests/{request_id}/status")
def update_status(request_id: int, status: str = Body(...)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE requests SET status=%s WHERE id=%s",
                (status, request_id)
            )
    return {"ok": True}


@app.post("/requests/{request_id}/assign")
def assign_request(request_id: int, payload: dict = Body(...)):
    partner_id = payload.get("partner_id")

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM partners WHERE id=%s", (partner_id,))
            partner = cur.fetchone()

            cur.execute("""
                UPDATE requests
                SET assigned_partner_id=%s
                WHERE id=%s
            """, (partner_id, request_id))

    if partner and partner["phone"]:
        try:
            twilio_client.messages.create(
                body="Nouvelle demande Paulo 📩",
                from_=TWILIO_WHATSAPP_NUMBER,
                to="whatsapp:" + partner["phone"]
            )
        except Exception as e:
            print("Erreur notif :", e)

    return {"ok": True}