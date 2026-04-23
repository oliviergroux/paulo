from fastapi import FastAPI, Request
from fastapi.responses import Response
import os
from openai import OpenAI
import requests
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor

import psycopg2
from psycopg2.extras import RealDictCursor

from fastapi import Body

from twilio.rest import Client as TwilioClient
twilio_client = TwilioClient(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)
TWILIO_FROM_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"), sslmode="require")

with get_db_connection() as conn:
    with conn.cursor() as cur:
        cur.execute("""
        CREATE TABLE IF NOT EXISTS requests (
            id SERIAL PRIMARY KEY,
            phone TEXT,
            transcription TEXT,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
            Bonjour, vous êtes sur Paulo. Expliquez votre demande après le bip..
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

    print("📞 Appel de :", caller)
    print("🎤 Audio URL :", recording_url)

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

    print("🧠 Transcription :", transcript.text)

    category = client.responses.create(
        model="gpt-4o-mini",
        input=f"""
Classe cette demande dans UNE seule catégorie parmi :
- transport : déplacement, taxi, trajet
- commerce : achat d’un produit (fleurs, pain, viande, courses, etc.) ou rdv coiffeur
- service_local : prestation d’un professionnel (plombier, électricien, jardinier, travaux, réparation)
- mairie : demande administrative, information ou problème dans la commune (problème de voierie, lumière, etc)
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

    print("🔎 Sous-type :", subtype.output_text)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO requests (phone, transcription, category, subtype) VALUES (%s, %s, %s, %s)",
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
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            if status == "done":
                cur.execute(
                    "UPDATE requests SET status = %s, handled_at = NOW() WHERE id = %s",
                    (status, request_id)
                )
            else:
                cur.execute(
                    "UPDATE requests SET status = %s WHERE id = %s",
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
                    COUNT(r.id) AS assigned_requests_count
                FROM partners p
                LEFT JOIN requests r ON r.assigned_partner_id = p.id AND r.archived = false
                GROUP BY p.id, p.name, p.category, p.subtype, p.is_active
                ORDER BY p.name ASC
            """)
            rows = cur.fetchall()
    return rows

@app.post("/requests/{request_id}/assign")
def assign_request(request_id: int, payload: dict = Body(...)):
    partner_id = payload.get("partner_id")

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            # 1. récupérer infos partenaire
            cur.execute("""
                SELECT id, name, phone
                FROM partners
                WHERE id = %s
            """, (partner_id,))
            partner = cur.fetchone()

            # 2. récupérer la demande
            cur.execute("""
                SELECT id, transcription, category, subtype
                FROM requests
                WHERE id = %s
            """, (request_id,))
            req = cur.fetchone()

            # 3. assignation
            cur.execute("""
                UPDATE requests
                SET assigned_to = %s,
                    assigned_partner_id = %s
                WHERE id = %s
            """, ("partner", partner_id, request_id))

    # 4. envoyer SMS (hors connexion DB)
    if partner and partner["phone"]:
        message = f"""
Nouvelle demande Paulo 📩

{req['transcription']}

Catégorie : {req['category']} / {req['subtype']}
Contact client : {req.get('phone', 'non fourni')}
        """

        try:
            twilio_client.messages.create(
                body=message,
                from_=TWILIO_FROM_NUMBER,
                to=partner["phone"]
            )
            print("📨 SMS envoyé à", partner["name"])
        except Exception as e:
            print("❌ Erreur SMS :", e)

    return {"ok": True}

@app.get("/partners/{partner_id}")
def get_partner(partner_id: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, category, subtype, is_active, created_at
                FROM partners
                WHERE id = %s
            """, (partner_id,))
            partner = cur.fetchone()

    return partner

@app.get("/partners/{partner_id}/requests")
def get_partner_requests(partner_id: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
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