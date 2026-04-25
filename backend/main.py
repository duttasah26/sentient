from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
# from services.vision import scan_objects
# from services.backboard import chat_object
# from services.elevenlabs import generate_voice

load_dotenv()

app = FastAPI(title="Bearhacks2026", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    context: list[str] = []

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
async def tts(object_id: str, text: str):
    """Text → audio stream"""
    return

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)