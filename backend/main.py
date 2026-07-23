"""
Sentient — BearHacks 2026
Each physical object gets its own Backboard.io agent (persistent memory across sessions).
MongoDB stores the object→agent mapping + personality.
YOLO + MiDaS handle detection and depth.
ElevenLabs speaks the agent's replies.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os, io, time, random, json
from services.vision import get_vision_labels, get_vision_objects_and_labels, match_fingerprint
from services import backboard, detection, objects_repo
from services.seed_data import DEFAULT_VOICES
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from PIL import Image
import numpy as np
from typing import Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

load_dotenv()

# ── Clients ───────────────────────────────────────────────────────────────────
elvn_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGO_URI        = os.getenv("MONGODB_URI")
MONGO_DB         = os.getenv("MONGODB_DB", "bearhacks")
MONGO_COLLECTION = os.getenv("MONGODB_COLLECTION", "objects")
mongo_client: AsyncIOMotorClient = None
db_collection = None

# ── In-memory scene state ─────────────────────────────────────────────────────
object_map:       Dict[str, dict]  = {}
last_triggered:   Dict[str, float] = {}
interactions_log: list             = []

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Sentient — BearHacks 2026", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ObjectSetup(BaseModel):
    name: str
    backstory: str
    voice_id: Optional[str] = None

class ChatMessage(BaseModel):
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Startup / Shutdown
# ─────────────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global mongo_client, db_collection

    mongo_client  = AsyncIOMotorClient(MONGO_URI)
    db_collection = mongo_client[MONGO_DB][MONGO_COLLECTION]
    print("MongoDB connected")

    await objects_repo.seed_hardcoded_objects(db_collection)

    midas_device = detection.load_midas_model()
    print(f"MiDaS loaded on {midas_device}")


@app.on_event("shutdown")
async def shutdown():
    if mongo_client:
        mongo_client.close()


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    count = await db_collection.count_documents({})
    return {"status": "alive", "objects_in_db": count, "objects_in_scene": len(object_map)}


@app.post("/capture")
@app.post("/setup/scan")
async def scan_room(file: UploadFile = File(...)):
    """Scan a frame, detect objects, enrich with depth + DB personality."""
    try:
        pil_img  = Image.open(io.BytesIO(await file.read())).convert("RGB")
        frame_np = np.array(pil_img)

        _, detections = detection.run_yolo(frame_np)
        depth_map     = detection.get_depth_map(frame_np)

        object_map.clear()
        last_triggered.clear()
        interactions_log.clear()

        enriched = []
        for det in detections:
            det = await objects_repo.enrich_detection(db_collection, det, depth_map)
            object_map[det["id"]] = det
            enriched.append(det)

        return {"ok": True, "total": len(enriched), "objects": enriched}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/live/detect")
async def live_detect(file: UploadFile = File(...)):
    """Detect objects via Vision API OBJECT_LOCALIZATION — accurate labels + bounding boxes."""
    try:
        image_bytes = await file.read()
        vision_objects, _ = await get_vision_objects_and_labels(image_bytes)

        enriched = []
        for vobj in vision_objects:
            label = vobj["name"]
            cx = (vobj["box"]["x1"] + vobj["box"]["x2"]) / 2
            cy = (vobj["box"]["y1"] + vobj["box"]["y2"]) / 2
            det = {
                "id":    detection.stable_object_id(label, cx, cy),
                "label": label,
                "conf":  vobj["score"],
                "cx": cx, "cy": cy,
                "box":   vobj["box"],
                "depth": None,
            }
            doc = await db_collection.find_one({"yolo_label": label})
            if doc:
                det.update(
                    name=doc.get("name", label),
                    backstory=doc.get("backstory", ""),
                    voice_id=doc.get("voice_id", DEFAULT_VOICES[0]),
                    has_agent=bool(doc.get("backboard_assistant_id")),
                )
            else:
                det.update(
                    name=label.title(),
                    backstory="",
                    voice_id=DEFAULT_VOICES[0],
                    has_agent=False,
                )
            enriched.append(det)

        return {"ok": True, "persons": [], "interactions": [], "all_objects": enriched}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/objects/{yolo_label}/setup")
async def setup_object(yolo_label: str, req: ObjectSetup):
    doc      = await db_collection.find_one({"yolo_label": yolo_label})
    voice_id = req.voice_id or (doc.get("voice_id") if doc else None) or random.choice(DEFAULT_VOICES)
    asst_id  = await backboard.create_assistant(req.name, req.backstory)

    await db_collection.update_one(
        {"yolo_label": yolo_label},
        {"$set": {
            "name": req.name, "backstory": req.backstory,
            "voice_id": voice_id, "yolo_label": yolo_label,
            "backboard_assistant_id": asst_id, "updated_at": time.time(),
        }},
        upsert=True,
    )
    for obj in object_map.values():
        if obj["label"] == yolo_label:
            obj.update({"name": req.name, "backstory": req.backstory,
                        "voice_id": voice_id, "has_agent": True})

    return {"ok": True, "name": req.name, "assistant_id": asst_id}


@app.post("/objects/{yolo_label}/fingerprint")
async def fingerprint_object(yolo_label: str, file: UploadFile = File(...)):
    """Store a Vision API fingerprint for an object so it can be recognised later."""
    try:
        image_bytes = await file.read()
        labels = await get_vision_labels(image_bytes)
        await db_collection.update_one(
            {"yolo_label": yolo_label},
            {"$set": {"vision_labels": labels, "updated_at": time.time()}},
        )
        return {"ok": True, "labels": labels}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/vision/identify")
async def vision_identify(
    file: UploadFile = File(...),
    x1: float = Form(...),
    y1: float = Form(...),
    x2: float = Form(...),
    y2: float = Form(...),
):
    """Crop a bounding-box region from the frame, run Vision API, match to stored fingerprints."""
    try:
        pil_img = Image.open(io.BytesIO(await file.read())).convert("RGB")
        w, h = pil_img.size
        crop = pil_img.crop((int(x1 * w), int(y1 * h), int(x2 * w), int(y2 * h)))
        buf = io.BytesIO()
        crop.save(buf, format="JPEG", quality=85)

        labels = await get_vision_labels(buf.getvalue())

        docs = []
        async for doc in db_collection.find(
            {"vision_labels": {"$exists": True, "$ne": []}}, {"_id": 0}
        ):
            docs.append(doc)

        best, score = match_fingerprint(labels, docs)
        if best and score >= 0.25:
            return {
                "matched_label": best["yolo_label"],
                "name": best["name"],
                "score": round(score, 3),
                "query_labels": labels,
            }
        return {"matched_label": None, "score": 0.0, "query_labels": labels}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/objects")
async def list_objects():
    docs = []
    async for doc in db_collection.find({}, {"_id": 0}):
        docs.append(doc)
    return {"objects": docs}


@app.post("/chat/{yolo_label}")
async def chat(yolo_label: str, req: ChatMessage):
    doc       = await objects_repo.ensure_assistant(db_collection, yolo_label)
    thread_id = await backboard.create_thread(doc["backboard_assistant_id"])
    reply     = await backboard.send_message(thread_id, req.message)
    return {"ok": True, "name": doc["name"], "voice_id": doc["voice_id"], "reply": reply}


@app.post("/tts/{yolo_label}")
async def tts(yolo_label: str, req: ChatMessage):
    doc      = await db_collection.find_one({"yolo_label": yolo_label})
    voice_id = doc.get("voice_id", DEFAULT_VOICES[0]) if doc else DEFAULT_VOICES[0]
    try:
        audio_gen   = elvn_client.text_to_speech.convert(
            text=req.message,
            voice_id=voice_id,
            model_id="eleven_turbo_v2",
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(c for c in audio_gen if c)
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f'inline; filename="{yolo_label}.mp3"'},
        )
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            headers={"xi-api-key": os.getenv("ELEVENLABS_API_KEY")},
            files={"file": ("voice.webm", audio_bytes, "audio/webm")},
            data={"model_id": "scribe_v1"},
        )
        res.raise_for_status()
    return {"text": res.json().get("text", "")}


@app.websocket("/ws/chat/{yolo_label}")
async def ws_chat(websocket: WebSocket, yolo_label: str):
    await websocket.accept()
    doc = thread_id = None

    try:
        doc = await objects_repo.ensure_assistant(db_collection, yolo_label)
        thread_id = doc.get("thread_id")
        if not thread_id:
            thread_id = await backboard.create_thread(doc["backboard_assistant_id"])
            await db_collection.update_one(
                {"yolo_label": yolo_label},
                {"$set": {"thread_id": thread_id}},
            )
        await websocket.send_json({
            "type":     "ready",
            "name":     doc["name"],
            "voice_id": doc["voice_id"],
        })

        # Auto-greeting: object speaks first
        greeting = await backboard.send_message(
            thread_id,
            "[System: A human just noticed you and opened a conversation. Greet them in character. 1-2 sentences max. Be natural, no stage directions.]"
        )
        if greeting:
            await websocket.send_json({
                "type":     "done",
                "full":     greeting,
                "voice_id": doc["voice_id"],
            })

        while True:
            data     = json.loads(await websocket.receive_text())
            user_msg = data.get("message", "").strip()
            if not user_msg:
                continue

            full_reply = await backboard.send_message(thread_id, user_msg)
            await websocket.send_json({
                "type":     "done",
                "full":     full_reply,
                "voice_id": doc["voice_id"],
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "detail": str(e)})
        except Exception:
            pass


@app.get("/demo/objects")
async def demo_objects():
    docs = []
    async for doc in db_collection.find({}, {"_id": 0, "backboard_assistant_id": 0}):
        docs.append(doc)
    return {"objects": docs}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
