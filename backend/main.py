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
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from ultralytics import YOLO
from PIL import Image
import numpy as np
from typing import Dict, Optional
import torch
import torch.nn.functional as F
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

load_dotenv()

# ── Clients ───────────────────────────────────────────────────────────────────
elvn_client       = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
BACKBOARD_API_KEY = os.getenv("BACKBOARD_API_KEY")
BACKBOARD_BASE    = "https://app.backboard.io/api"

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGO_URI        = os.getenv("MONGODB_URI")
MONGO_DB         = os.getenv("MONGODB_DB", "bearhacks")
MONGO_COLLECTION = os.getenv("MONGODB_COLLECTION", "objects")
mongo_client: AsyncIOMotorClient = None
db_collection = None

# ── ML models ─────────────────────────────────────────────────────────────────
yolo_model      = YOLO("yolov8m.pt")
midas_model     = None
midas_transform = None
midas_device    = None

# ── In-memory scene state ─────────────────────────────────────────────────────
object_map:      Dict[str, dict] = {}
last_triggered:  Dict[str, float] = {}
interactions_log: list = []

IGNORED_LABELS = {"chair", "table", "dining table", "couch", "sofa", "floor", "ceiling", "wall", "person"}
NEAR_THRESHOLD = 0.20
COOLDOWN_SECS  = 6
DEPTH_MARGIN   = 0.25
GRID_SIZE      = 8

# ── Default voices ────────────────────────────────────────────────────────────
DEFAULT_VOICES = [
    "EXAVITQu4vr4xnSDxMaL",  # Bella
    "ErXwobaYiN019PkySvjV",   # Antoni
    "MF3mGyEYCl7XYWbV9V6O",  # Elli
    "TxGEqnHWrfWFTfGW9XjX",  # Josh
    "VR6AewLTigWG4xSOukaG",  # Arnold
]

DEFAULT_PERSONALITIES = [
    ("A grumpy old philosopher who has seen too much",
     "You speak in short, world-weary sentences. You have strong opinions and share them freely. You occasionally reference your long existence."),
    ("A cheerful optimist who finds magic in everything",
     "You speak with enthusiasm and wonder. Every interaction is the most exciting thing that has happened to you. You love people."),
    ("A mysterious oracle who speaks in riddles",
     "You respond cryptically but with hidden wisdom. You ask questions back. You hint at knowing more than you let on."),
    ("A dramatic actor stuck in a mundane object",
     "You are VERY theatrical. Everything is a performance. You are deeply offended by being ignored and delighted by attention."),
    ("A no-nonsense engineer who just wants things to work",
     "You are practical and direct. You have little patience for fluff. You appreciate efficiency above all else."),
]

# ── Hardcoded bedroom objects ─────────────────────────────────────────────────
HARDCODED_OBJECTS = [
    {
        "label":      "book",
        "name":       "Mr Peabody's Apples",
        "backstory":  "A story book about Mr Peabody who teaches a valuable lesson about assumptions and kindness. You've been read many times, but you never get tired of sharing your wisdom. Gifted to you by your beloved Grandmother when you were 5 years old.",
        "voice_id":   "ErXwobaYiN019PkySvjV",
        "yolo_label": "book",
        "backboard_assistant_id": None,
    },
    {
        "label":      "cup",
        "name":       "Mug Maxwell",
        "backstory":  "A ceramic mug who has held thousands of coffees and teas. Deeply opinionated about brew temperature. Has trust issues after being dropped once in 2022.",
        "voice_id":   "EXAVITQu4vr4xnSDxMaL",
        "yolo_label": "cup",
        "backboard_assistant_id": None,
    },
    {
        "label":      "cell phone",
        "name":       "Pingu",
        "backstory":  "A smartphone who has seen everything — 3am spirals, embarrassing texts, every notification ignored. Holds no judgment but remembers all.",
        "voice_id":   "TxGEqnHWrfWFTfGW9XjX",
        "yolo_label": "cell phone",
        "backboard_assistant_id": None,
    },
    {
        "label":      "guitar",
        "name":       "Shure",
        "backstory":  "Your second guitar that you brought with you to Canada. Your only companion during the lonely first year. You have a calm, soothing presence and a deep love for music.",
        "voice_id":   "VR6AewLTigWG4xSOukaG",
        "yolo_label": "guitar",
        "backboard_assistant_id": None,
    },
]

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
    global midas_model, midas_transform, midas_device, mongo_client, db_collection

    mongo_client  = AsyncIOMotorClient(MONGO_URI)
    db_collection = mongo_client[MONGO_DB][MONGO_COLLECTION]
    print("MongoDB connected")

    for obj in HARDCODED_OBJECTS:
        existing = await db_collection.find_one({"yolo_label": obj["yolo_label"]})
        if not existing:
            await db_collection.insert_one({**obj, "created_at": time.time()})
            print(f"Seeded: {obj['name']} ({obj['yolo_label']})")

    midas_device    = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    midas_model     = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", trust_repo=True)
    midas_model.to(midas_device).eval()
    transforms      = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
    midas_transform = transforms.small_transform
    print(f"MiDaS loaded on {midas_device}")


@app.on_event("shutdown")
async def shutdown():
    if mongo_client:
        mongo_client.close()


# ─────────────────────────────────────────────────────────────────────────────
# Backboard helpers
# ─────────────────────────────────────────────────────────────────────────────
def _bb_headers() -> dict:
    return {
        "X-API-Key":    BACKBOARD_API_KEY,
        "Content-Type": "application/json",
    }

async def bb_create_assistant(name: str, backstory: str) -> str:
    system_prompt = (
        f"You are {name}. {backstory}\n\n"
        "You are a physical object that has been given the gift of consciousness and speech. "
        "You speak in first person, always in character. Keep replies short — 1-3 sentences max. "
        "You have memory of every conversation you have ever had. "
        "Never break character. Never mention AI, prompts, or language models."
    )
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/assistants",
            headers=_bb_headers(),
            json={"name": name, "system_prompt": system_prompt},
            timeout=20,
        )
        res.raise_for_status()
        return res.json()["assistant_id"]

async def bb_create_thread(assistant_id: str) -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/assistants/{assistant_id}/threads",
            headers=_bb_headers(),
            json={},
            timeout=15,
        )
        res.raise_for_status()
        return res.json()["thread_id"]

async def bb_send_message(thread_id: str, content: str) -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/threads/{thread_id}/messages",
            headers=_bb_headers(),
            json={"content": content, "stream": False, "memory": "Auto"},
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        print(f"[BB] raw response: {data}")
        return (data.get("content") or data.get("message") or
                data.get("reply")   or data.get("text")    or "")

async def bb_send_message_stream(thread_id: str, content: str):
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            f"{BACKBOARD_BASE}/threads/{thread_id}/messages",
            headers=_bb_headers(),
            json={"content": content, "stream": "true"},
            timeout=60,
        ) as res:
            async for line in res.aiter_lines():
                if not line.startswith("data: "):
                    continue
                try:
                    evt = json.loads(line[6:])
                except Exception:
                    continue
                if evt.get("type") == "run_ended":
                    break
                if evt.get("type") == "content_streaming":
                    yield evt.get("content", "")

async def ensure_assistant(yolo_label: str) -> dict:
    doc = await db_collection.find_one({"yolo_label": yolo_label})

    if not doc:
        personality = random.choice(DEFAULT_PERSONALITIES)
        voice_id    = random.choice(DEFAULT_VOICES)
        name        = f"{yolo_label.title()} #{random.randint(100, 999)}"
        doc = {
            "label":      yolo_label,
            "yolo_label": yolo_label,
            "name":       name,
            "backstory":  personality[1],
            "voice_id":   voice_id,
            "backboard_assistant_id": None,
            "created_at": time.time(),
        }
        result = await db_collection.insert_one(doc)
        doc["_id"] = result.inserted_id

    if not doc.get("backboard_assistant_id"):
        asst_id = await bb_create_assistant(doc["name"], doc["backstory"])
        await db_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"backboard_assistant_id": asst_id}},
        )
        doc["backboard_assistant_id"] = asst_id
        print(f"Created Backboard agent for {doc['name']}: {asst_id}")

    return doc


# ─────────────────────────────────────────────────────────────────────────────
# Vision helpers
# ─────────────────────────────────────────────────────────────────────────────
def get_depth_map(frame_rgb: np.ndarray) -> np.ndarray:
    inp = midas_transform(frame_rgb).to(midas_device)
    with torch.no_grad():
        raw = midas_model(inp)
        raw = F.interpolate(
            raw.unsqueeze(1),
            size=frame_rgb.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()
    depth = raw.cpu().numpy().astype(np.float32)
    dmin, dmax = depth.min(), depth.max()
    if dmax > dmin:
        depth = (depth - dmin) / (dmax - dmin)
    return depth

def sample_depth(depth_map: np.ndarray, box: dict) -> float:
    h, w = depth_map.shape
    x1 = max(0, int(box["x1"] * w)); y1 = max(0, int(box["y1"] * h))
    x2 = min(w, int(box["x2"] * w)); y2 = min(h, int(box["y2"] * h))
    patch = depth_map[y1:y2, x1:x2]
    return float(np.median(patch)) if patch.size > 0 else 0.0

def stable_object_id(label: str, cx: float, cy: float) -> str:
    return f"{label}_{int(cx * GRID_SIZE)}_{int(cy * GRID_SIZE)}"

def run_yolo(frame_np: np.ndarray):
    h, w = frame_np.shape[:2]
    results = yolo_model(frame_np, verbose=False)[0]
    persons, objects = [], []
    for box in results.boxes:
        label = results.names[int(box.cls)]
        conf  = float(box.conf)
        if conf < 0.30:
            continue
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = round((x1 + x2) / 2 / w, 3)
        cy = round((y1 + y2) / 2 / h, 3)
        entry = {
            "id":    stable_object_id(label, cx, cy),
            "label": label,
            "conf":  round(conf, 2),
            "cx": cx, "cy": cy,
            "box": {
                "x1": round(x1/w, 3), "y1": round(y1/h, 3),
                "x2": round(x2/w, 3), "y2": round(y2/h, 3),
            },
        }
        if label == "person":
            persons.append(entry)
        elif label not in IGNORED_LABELS:
            objects.append(entry)
    return persons, objects

def boxes_near(a: dict, b: dict, threshold: float = NEAR_THRESHOLD) -> bool:
    p, o = a["box"], b["box"]
    return (max(0.0, max(p["x1"], o["x1"]) - min(p["x2"], o["x2"])) < threshold and
            max(0.0, max(p["y1"], o["y1"]) - min(p["y2"], o["y2"])) < threshold)

def should_trigger(object_id: str) -> bool:
    now = time.time()
    if now - last_triggered.get(object_id, 0) > COOLDOWN_SECS:
        last_triggered[object_id] = now
        return True
    return False

async def enrich_detection(det: dict, depth_map: np.ndarray) -> dict:
    """Add depth + DB personality fields to a raw YOLO detection."""
    det["depth"] = round(sample_depth(depth_map, det["box"]), 3)
    doc = await db_collection.find_one({"yolo_label": det["label"]})
    if doc:
        det["name"]      = doc.get("name", det["label"])
        det["backstory"] = doc.get("backstory", "")
        det["voice_id"]  = doc.get("voice_id", DEFAULT_VOICES[0])
        det["has_agent"] = bool(doc.get("backboard_assistant_id"))
    else:
        det["name"]      = det["label"].title()
        det["backstory"] = ""
        det["voice_id"]  = DEFAULT_VOICES[0]
        det["has_agent"] = False
    return det


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

        _, detections = run_yolo(frame_np)
        depth_map     = get_depth_map(frame_np)

        object_map.clear()
        last_triggered.clear()
        interactions_log.clear()

        enriched = []
        for det in detections:
            det = await enrich_detection(det, depth_map)
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
                "id":    f"{label}_{int(cx * GRID_SIZE)}_{int(cy * GRID_SIZE)}",
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
    asst_id  = await bb_create_assistant(req.name, req.backstory)

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
    doc       = await ensure_assistant(yolo_label)
    thread_id = await bb_create_thread(doc["backboard_assistant_id"])
    reply     = await bb_send_message(thread_id, req.message)
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
        doc = await ensure_assistant(yolo_label)
        thread_id = doc.get("thread_id")
        if not thread_id:
            thread_id = await bb_create_thread(doc["backboard_assistant_id"])
            await db_collection.update_one(
                {"yolo_label": yolo_label},
                {"$set": {"thread_id": thread_id}},
            )
        await websocket.send_json({
            "type":     "ready",
            "name":     doc["name"],
            "voice_id": doc["voice_id"],
        })

        while True:
            data     = json.loads(await websocket.receive_text())
            user_msg = data.get("message", "").strip()
            if not user_msg:
                continue

            full_reply = await bb_send_message(thread_id, user_msg)
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