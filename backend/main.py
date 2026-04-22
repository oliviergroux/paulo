from fastapi import FastAPI, Request
from fastapi.responses import Response

app = FastAPI()


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
            Bonjour, vous êtes sur Paulo, l'assistant Paulo conçu pour les Saint-Pauliens.
            Expliquez simplement votre demande après le bip.
        </Say>
        <Record maxLength="120" playBeep="true" />
    </Response>
    """
    return Response(content=twiml, media_type="application/xml")