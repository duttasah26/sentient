"""
Sentient — BearHacks 2026
Each physical object gets its own Backboard.io agent (persistent memory across sessions).
MongoDB stores the object→agent mapping + personality.
YOLO + MiDaS handle detection and depth.
ElevenLabs speaks the agent's replies.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os, io, time, base64, random, asyncio
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
elvn_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
BACKBOARD_API_KEY = os.getenv("BACKBOARD_API_KEY")
BACKBOARD_BASE    = "https://app.backboard.io/api"
CLOUD_VISION_API_KEY = os.getenv("CLOUD_VISION_API_KEY")

# ── MongoDB (motor = async) ───────────────────────────────────────────────────
MONGO_URI        = os.getenv("MONGODB_URI")
MONGO_DB         = os.getenv("MONGODB_DB", "bearhacks")
MONGO_COLLECTION = os.getenv("MONGODB_COLLECTION", "objects")
mongo_client: AsyncIOMotorClient = None
db_collection = None

# ── ML models (loaded at startup) ────────────────────────────────────────────
yolo_model      = YOLO("yolov8m.pt")
midas_model     = None
midas_transform = None
midas_device    = None

# ── In-memory scene state (reset on each scan) ───────────────────────────────
object_map:   Dict[str, dict] = {}   # yolo_id → detection dict
last_triggered: Dict[str, float] = {}
interactions_log: list = []

IGNORED_LABELS = {"chair", "table", "dining table", "couch", "sofa", "floor", "ceiling", "wall", "person"}
NEAR_THRESHOLD = 0.20
COOLDOWN_SECS  = 6
DEPTH_MARGIN   = 0.25
GRID_SIZE      = 8

# ── Default voices for random personality assignment ─────────────────────────
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

# ── Hardcoded bedroom objects for demo (pre-created agents) ──────────────────
# These work even without scanning — judges can interact with them immediately.
# Set backboard_assistant_id to None to auto-create on first use.
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

# ── Pydantic models ───────────────────────────────────────────────────────────
class ObjectSetup(BaseModel):
    name: str
    backstory: str
    voice_id: Optional[str] = None

class ChatMessage(BaseModel):
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global midas_model, midas_transform, midas_device, mongo_client, db_collection

    # MongoDB
    mongo_client  = AsyncIOMotorClient(MONGO_URI)
    db_collection = mongo_client[MONGO_DB][MONGO_COLLECTION]
    print("MongoDB connected")

    # Seed hardcoded bedroom objects into DB (skip if already there)
    for obj in HARDCODED_OBJECTS:
        existing = await db_collection.find_one({"yolo_label": obj["yolo_label"]})
        if not existing:
            await db_collection.insert_one({**obj, "created_at": time.time()})
            print(f"Seeded hardcoded object: {obj['name']} ({obj['yolo_label']})")

    # MiDaS
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
        "Authorization": f"Bearer {BACKBOARD_API_KEY}",
        "Content-Type":  "application/json",
    }


async def bb_create_assistant(name: str, backstory: str) -> str:
    """Create a Backboard assistant for an object. Returns assistant_id."""
    system_prompt = (
        f"You are {name}. {backstory}\n\n"
        "You are a physical object that has been given the gift of consciousness and speech. "
        "You speak in first person, always in character. Keep replies short — 1-3 sentences max. "
        "You have memory of every conversation you have ever had. "
        "Never break character. Never mention AI, prompts, or language models."
    )
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/v1/assistants",
            headers=_bb_headers(),
            json={
                "name":             name,
                "system_prompt":    system_prompt,
                "llm_provider":     "anthropic",
                "llm_model_name":   "claude-sonnet-4-20250514",
                "memory_enabled":   True,
            },
            timeout=20,
        )
        res.raise_for_status()
        return res.json()["assistant_id"]


async def bb_create_thread(assistant_id: str) -> str:
    """Open a new conversation thread on an assistant. Returns thread_id."""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/v1/threads",
            headers=_bb_headers(),
            json={"assistant_id": assistant_id},
            timeout=15,
        )
        res.raise_for_status()
        return res.json()["thread_id"]


async def bb_send_message(thread_id: str, content: str) -> str:
    """Send a message to a thread and return the assistant's reply text."""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BACKBOARD_BASE}/v1/threads/{thread_id}/messages",
            headers=_bb_headers(),
            json={
                "role":    "user",
                "content": content,
                "memory":  "Auto",       # auto extract + recall memories
            },
            timeout=30,
        )
        res.raise_for_status()
        data = res.json()
        # Backboard returns the assistant message in the response
        return data.get("content") or data.get("message") or data.get("reply") or ""


async def bb_send_message_stream(thread_id: str, content: str):
    """Stream reply tokens from Backboard. Yields text chunks."""
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            f"{BACKBOARD_BASE}/v1/threads/{thread_id}/messages",
            headers={**_bb_headers(), "Accept": "text/event-stream"},
            json={
                "role":    "user",
                "content": content,
                "memory":  "Auto",
                "stream":  True,
            },
            timeout=60,
        ) as res:
            async for line in res.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk.strip() == "[DONE]":
                        break
                    yield chunk


async def ensure_assistant(yolo_label: str) -> dict:
    """
    Load object doc from MongoDB. If it has no assistant_id yet, create one.
    Returns the full object doc.
    """
    doc = await db_collection.find_one({"yolo_label": yolo_label})

    if not doc:
        # Unknown object — assign random personality
        personality = random.choice(DEFAULT_PERSONALITIES)
        voice_id    = random.choice(DEFAULT_VOICES)
        name        = f"{yolo_label.title()} #{random.randint(100,999)}"
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
        print(f"Created Backboard assistant for {doc['name']}: {asst_id}")

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


def run_yolo(frame_np: np.ndarray, only_persons: bool = False):
    h, w = frame_np.shape[:2]
    results = yolo_model(frame_np, verbose=False)[0]
    persons, objects = [], []
    for box in results.boxes:
        label = results.names[int(box.cls)]
        conf  = float(box.conf)
        if conf < 0.30:
            continue
        if only_persons and label != "person":
            continue
        if not only_persons and label in IGNORED_LABELS:
            continue
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = round((x1 + x2) / 2 / w, 3)
        cy = round((y1 + y2) / 2 / h, 3)
        entry = {
            "id":    stable_object_id(label, cx, cy),
            "label": label,
            "conf":  round(conf, 2),
            "cx":    cx, "cy": cy,
            "box": {
                "x1": round(x1/w, 3), "y1": round(y1/h, 3),
                "x2": round(x2/w, 3), "y2": round(y2/h, 3),
            },
        }
        (persons if label == "person" else objects).append(entry)
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


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    count = await db_collection.count_documents({})
    return {"status": "alive", "objects_in_db": count, "objects_in_scene": len(object_map)}


# ── Scan ──────────────────────────────────────────────────────────────────────
@app.post("/capture")
@app.post("/setup/scan")
async def scan_room(file: UploadFile = File(...)):
    """Scan a frame, detect objects, enrich with depth + DB personality."""
    try:
        image_bytes = await file.read()
        pil_img     = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        frame_np    = np.array(pil_img)

        _, detections = run_yolo(frame_np)
        depth_map     = get_depth_map(frame_np)

        object_map.clear()
        last_triggered.clear()
        interactions_log.clear()

        enriched = []
        for det in detections:
            det["depth"] = round(sample_depth(depth_map, det["box"]), 3)
            # Look up personality from DB (non-blocking read)
            doc = await db_collection.find_one({"yolo_label": det["label"]})
            if doc:
                det["name"]     = doc.get("name", det["label"])
                det["backstory"] = doc.get("backstory", "")
                det["voice_id"] = doc.get("voice_id", DEFAULT_VOICES[0])
                det["has_agent"] = bool(doc.get("backboard_assistant_id"))
            else:
                det["name"]      = det["label"].title()
                det["backstory"] = ""
                det["voice_id"]  = DEFAULT_VOICES[0]
                det["has_agent"] = False
            object_map[det["id"]] = det
            enriched.append(det)

        return {"ok": True, "total": len(enriched), "objects": enriched}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Live detect ───────────────────────────────────────────────────────────────
@app.post("/live/detect")
async def live_detect(file: UploadFile = File(...)):
    """Detect objects + persons, return which objects are in frame right now."""
    try:
        image_bytes = await file.read()
        pil_img     = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        frame_np    = np.array(pil_img)

        persons, fresh_objects = run_yolo(frame_np)
        depth_map = get_depth_map(frame_np)
        now = time.time()

        # Update live positions of stored objects
        used = set()
        for stored_id, stored_obj in object_map.items():
            best_idx, best_dist = None, float("inf")
            for i, det in enumerate(fresh_objects):
                if i in used or det["label"] != stored_obj["label"]:
                    continue
                dist = abs(det["cx"] - stored_obj["cx"]) + abs(det["cy"] - stored_obj["cy"])
                if dist < best_dist:
                    best_dist, best_idx = dist, i
            if best_idx is not None:
                used.add(best_idx)
                det = fresh_objects[best_idx]
                object_map[stored_id].update({
                    "box": det["box"], "cx": det["cx"],
                    "cy": det["cy"], "conf": det["conf"],
                    "depth": round(sample_depth(depth_map, det["box"]), 3),
                })

        # Interaction detection — closest-depth-match wins
        interactions = []
        for person in persons:
            p_depth = float(person["box"]["y2"] - person["box"]["y1"])
            candidates = []
            for obj in object_map.values():
                if not boxes_near(person, obj):
                    continue
                obj_depth = obj.get("depth", 0.5)
                if p_depth < obj_depth - DEPTH_MARGIN:
                    continue
                candidates.append((abs(p_depth - obj_depth), obj))
            if not candidates:
                continue
            candidates.sort(key=lambda x: x[0])
            _, best = candidates[0]
            if not should_trigger(best["id"]):
                continue
            event = {
                "object_id":    best["id"],
                "object_label": best["label"],
                "object_name":  best.get("name", best["label"]),
                "person_box":   person["box"],
                "object_box":   best["box"],
                "timestamp":    now,
            }
            interactions_log.append(event)
            interactions.append(event)

        return {
            "ok":           True,
            "persons":      persons,
            "interactions": interactions,
            "all_objects":  list(object_map.values()),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Object setup (name + backstory) ──────────────────────────────────────────
@app.post("/objects/{yolo_label}/setup")
async def setup_object(yolo_label: str, req: ObjectSetup):
    """
    Set or update name + backstory for an object.
    Creates (or recreates) the Backboard assistant with the new personality.
    """
    doc = await db_collection.find_one({"yolo_label": yolo_label})
    voice_id = req.voice_id or (doc.get("voice_id") if doc else None) or random.choice(DEFAULT_VOICES)

    # Always create a fresh assistant when personality changes
    asst_id = await bb_create_assistant(req.name, req.backstory)

    update = {
        "name":       req.name,
        "backstory":  req.backstory,
        "voice_id":   voice_id,
        "yolo_label": yolo_label,
        "backboard_assistant_id": asst_id,
        "updated_at": time.time(),
    }
    await db_collection.update_one(
        {"yolo_label": yolo_label},
        {"$set": update},
        upsert=True,
    )

    # Refresh in-memory object_map if object is in current scene
    for obj in object_map.values():
        if obj["label"] == yolo_label:
            obj.update({"name": req.name, "backstory": req.backstory,
                        "voice_id": voice_id, "has_agent": True})

    return {"ok": True, "name": req.name, "assistant_id": asst_id}


@app.get("/objects")
async def list_objects():
    """All objects in DB with their personalities."""
    docs = []
    async for doc in db_collection.find({}, {"_id": 0}):
        docs.append(doc)
    return {"objects": docs}


# ── Chat (single turn, returns text + triggers TTS) ──────────────────────────
@app.post("/chat/{yolo_label}")
async def chat(yolo_label: str, req: ChatMessage):
    """
    Send a message to an object's agent.
    Returns the reply text. Frontend calls /tts separately if needed.
    """
    doc = await ensure_assistant(yolo_label)
    thread_id = await bb_create_thread(doc["backboard_assistant_id"])
    reply = await bb_send_message(thread_id, req.message)
    return {
        "ok":       True,
        "name":     doc["name"],
        "voice_id": doc["voice_id"],
        "reply":    reply,
    }


# ── TTS ───────────────────────────────────────────────────────────────────────
@app.post("/tts/{yolo_label}")
async def tts(yolo_label: str, req: ChatMessage):
    """Generate speech from text using the object's assigned ElevenLabs voice."""
    doc = await db_collection.find_one({"yolo_label": yolo_label})
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


# ── WebSocket — real-time conversation ───────────────────────────────────────
@app.websocket("/ws/chat/{yolo_label}")
async def ws_chat(websocket: WebSocket, yolo_label: str):
    """
    Real-time conversation with an object's Backboard agent.

    Protocol:
      Client sends: JSON { "message": "hello" }
      Server sends: JSON { "type": "token", "text": "..." }  (streamed tokens)
                    JSON { "type": "done",  "full": "...", "voice_id": "..." }
                    JSON { "type": "error", "detail": "..." }

    One WebSocket = one conversation session (one Backboard thread).
    Thread persists the whole session; memory auto-extracted by Backboard.
    """
    await websocket.accept()
    doc = thread_id = None

    try:
        # Set up agent + thread once per connection
        doc       = await ensure_assistant(yolo_label)
        thread_id = await bb_create_thread(doc["backboard_assistant_id"])
        await websocket.send_json({
            "type":     "ready",
            "name":     doc["name"],
            "voice_id": doc["voice_id"],
        })

        while True:
            raw  = await websocket.receive_text()
            import json as _json
            data = _json.loads(raw)
            user_msg = data.get("message", "").strip()
            if not user_msg:
                continue

            # Try streaming first; fall back to single-shot if stream not supported
            full_reply = ""
            try:
                async for chunk in bb_send_message_stream(thread_id, user_msg):
                    full_reply += chunk
                    await websocket.send_json({"type": "token", "text": chunk})
            except Exception:
                # Fallback: non-streaming
                full_reply = await bb_send_message(thread_id, user_msg)
                await websocket.send_json({"type": "token", "text": full_reply})

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


# ── Hardcoded demo objects (bypass YOLO, for judge demo) ─────────────────────
@app.get("/demo/objects")
async def demo_objects():
    """Return all DB objects — used to populate the demo panel without scanning."""
    docs = []
    async for doc in db_collection.find({}, {"_id": 0, "backboard_assistant_id": 0}):
        docs.append(doc)
    return {"objects": docs}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)