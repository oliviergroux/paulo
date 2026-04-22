from fastapi import FastAPI, Request
from fastapi.responses import Response
import os
from openai import OpenAI
import requests

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

    print("📞 Appel de :", caller)
    print("🎤 Audio URL :", recording_url)

    # téléchargement audio
    audio_file = requests.get(recording_url + ".wav").content

    with open("audio.wav", "wb") as f:
        f.write(audio_file)

    # transcription
        with open("audio.wav", "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=f
            )

        print("🧠 Transcription :", transcript.text)

    #summary
        summary = client.responses.create(
            model="gpt-5.4-mini",
            input=f"Résume en une phrase simple cette demande client : {transcript.text}"
    )
    
    print("📦 Résumé :", summary.output_text)

    return Response(
        content="""
        <Response>
            <Say>Merci, votre demande a bien été enregistrée.</Say>
        </Response>
        """,
        media_type="application/xml"
    )