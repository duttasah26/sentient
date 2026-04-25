from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
import os, io
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play

load_dotenv()

client = ElevenLabs(
  api_key=os.getenv("ELEVENLABS_API_KEY"),
)

TEST_VOICE = "EXAVITQu4vr4xnSDxMaL"

app = FastAPI(title="Bearhacks2026", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data structures
class ChatRequest(BaseModel):
    message: str
    context: list[str] = []

class TTSRequest(BaseModel): 
    text: str

# Endpoints
@app.get("/health")
async def health():
    return {"status": "alive", "vision": "ready"}

@app.post("/capture")
async def capture_frame(frame: UploadFile = File(..., alias="file")):
    """Pi/webcam frame -> vision objects"""
    content = await frame.read()

    return f"working: {frame}!"

@app.post("/chat/{object_id}")
async def chat(object_id: str, req: ChatRequest):
    """Object personality response"""
    return
    
@app.post("/tts/{object_id}")
async def tts(object_id: str, req: TTSRequest):
    """Takes text as input and returns an ai audio clip"""
    try:
        audio_generator = client.text_to_speech.convert(
            text=req.text,
            voice_id="qhH5VOAvpCwvNpmn2srO",
            model_id="eleven_turbo_v2",
            output_format="mp3_44100_128"
        )
    
        audio_bytes = b""
        for chunk in audio_generator:
            if chunk:
                audio_bytes += chunk
        
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f'inline; filename="{object_id}.mp3"'}
        )
    except Exception as e:
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)