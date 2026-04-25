from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import base64
import requests
# from services.vision import scan_objects
# from services.backboard import chat_object
# from services.elevenlabs import generate_voice

load_dotenv()
CLOUD_VISION_API_KEY = os.getenv("CLOUD_VISION_API_KEY")
if not CLOUD_VISION_API_KEY:
    raise RuntimeError("Missing CLOUD_VISION_API_KEY")

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
    try:
        # Read image bytes
        content = await frame.read()

        # Convert to base64
        image_base64 = base64.b64encode(content).decode("utf-8")

        # Build Vision API request
        vision_request = {
            "requests": [
                {
                    "image": {
                        "content": image_base64
                    },
                    "features": [
                        {
                            "type": "OBJECT_LOCALIZATION",  # 👈 gives bounding boxes
                            "maxResults": 10
                        }
                    ]
                }
            ]
        }

        # Call Google Vision API
        response = requests.post(
            f"https://vision.googleapis.com/v1/images:annotate?key={CLOUD_VISION_API_KEY}",
            json=vision_request
        )

        result = response.json()
        print(result)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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