from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os, io, time, base64, requests
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from ultralytics import YOLO
from PIL import Image
import numpy as np

load_dotenv()

elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
CLOUD_VISION_API_KEY = os.getenv("CLOUD_VISION_API_KEY")
if not CLOUD_VISION_API_KEY:
    raise RuntimeError("Missing CLOUD_VISION_API_KEY")

model = YOLO("yolov8m.pt")

# ── Ignored labels ────────────────────────────────────────────────────────────
IGNORED_LABELS = {"chair", "table", "dining table", "couch", "sofa", "floor", "ceiling", "wall"}

object_map       = {}
last_triggered   = {}
interactions_log = []

NEAR_THRESHOLD = 0.15
COOLDOWN_SECS  = 8

app = FastAPI(title="Sentient — BearHacks 2026", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    message: str
    context: list[str] = []

def run_yolo(frame_np, only_persons=False):
    h, w = frame_np.shape[:2]
    results = model(frame_np, verbose=False)[0]
    persons, objects = [], []
    for i, box in enumerate(results.boxes):
        label = results.names[int(box.cls)]
        conf  = float(box.conf)
        if conf < 0.25:
            continue
        if only_persons and label != "person":
            continue
        if not only_persons and label in IGNORED_LABELS:
            continue
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        entry = {
            "id":    f"{label}_{i}",
            "label": label,
            "conf":  round(conf, 2),
            "cx":    round((x1 + x2) / 2 / w, 3),
            "cy":    round((y1 + y2) / 2 / h, 3),
            "box": {
                "x1": round(x1/w, 3), "y1": round(y1/h, 3),
                "x2": round(x2/w, 3), "y2": round(y2/h, 3),
            }
        }
        (persons if label == "person" else objects).append(entry)
    return persons, objects

def vision_ocr(image_bytes: bytes) -> str | None:
    b64 = base64.b64encode(image_bytes).decode()
    res = requests.post(
        f"https://vision.googleapis.com/v1/images:annotate?key={CLOUD_VISION_API_KEY}",
        json={"requests": [{"image": {"content": b64},
                            "features": [{"type": "TEXT_DETECTION", "maxResults": 1}]}]}
    )
    annotations = res.json().get("responses", [{}])[0].get("textAnnotations", [])
    return annotations[0]["description"].strip() if annotations else None

def boxes_near(person, obj, threshold=NEAR_THRESHOLD) -> bool:
    p, o = person["box"], obj["box"]
    horiz_gap = max(0, max(p["x1"], o["x1"]) - min(p["x2"], o["x2"]))
    vert_gap  = max(0, max(p["y1"], o["y1"]) - min(p["y2"], o["y2"]))
    return horiz_gap < threshold and vert_gap < threshold

def should_trigger(object_id: str) -> bool:
    now = time.time()
    if now - last_triggered.get(object_id, 0) > COOLDOWN_SECS:
        last_triggered[object_id] = now
        return True
    return False

def crop_object(pil_img, obj) -> bytes:
    w, h = pil_img.size
    box  = obj["box"]
    crop = pil_img.crop((int(box["x1"]*w), int(box["y1"]*h),
                         int(box["x2"]*w), int(box["y2"]*h)))
    buf  = io.BytesIO()
    crop.save(buf, format="JPEG")
    return buf.getvalue()

def estimate_depth(box: dict) -> str:
    height = box["y2"] - box["y1"]
    if height > 0.4:  return "very_close"
    if height > 0.2:  return "near"
    if height > 0.08: return "mid"
    return "far"


@app.get("/health")
async def health():
    return {"status": "alive", "objects_stored": len(object_map), "interactions": len(interactions_log)}


@app.post("/capture")
async def capture(file: UploadFile = File(...)):
    return await scan_room(file)


@app.post("/setup/scan")
async def scan_room(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        pil_img     = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        frame_np    = np.array(pil_img)

        _, objects = run_yolo(frame_np)

        object_map.clear()
        last_triggered.clear()
        interactions_log.clear()

        for obj in objects:
            crop_bytes      = crop_object(pil_img, obj)
            obj["ocr_text"] = vision_ocr(crop_bytes)
            obj["depth"]    = estimate_depth(obj["box"])
            object_map[obj["id"]] = obj

        return {"ok": True, "total": len(object_map), "objects": list(object_map.values())}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/setup/objects")
async def get_objects():
    return {"objects": list(object_map.values())}


@app.post("/live/detect")
async def live_detect(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        pil_img     = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        frame_np    = np.array(pil_img)

        persons, _ = run_yolo(frame_np, only_persons=True)

        interactions = []
        for person in persons:
            person["depth"] = estimate_depth(person["box"])
            for obj in object_map.values():
                if boxes_near(person, obj) and should_trigger(obj["id"]):
                    event = {
                        "object_id":    obj["id"],
                        "object_label": obj["label"],
                        "ocr_text":     obj.get("ocr_text"),
                        "person_box":   person["box"],
                        "object_box":   obj["box"],
                        "person_depth": person["depth"],
                        "object_depth": obj.get("depth"),
                        "timestamp":    time.time(),
                    }
                    interactions_log.append(event)
                    interactions.append(event)

        return {"ok": True, "persons": persons, "interactions": interactions, "all_objects": list(object_map.values())}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/live/log")
async def get_log():
    return {"total": len(interactions_log), "interactions": interactions_log}


@app.post("/chat/{object_id}")
async def chat(object_id: str, req: ChatRequest):
    obj = object_map.get(object_id)
    if not obj:
        raise HTTPException(404, f"Object '{object_id}' not found in scene")
    return {"object_id": object_id, "reply": None}


@app.post("/tts/{object_id}")
async def tts(object_id: str, req: TTSRequest):
    try:
        audio_generator = elevenlabs_client.text_to_speech.convert(
            text=req.text,
            voice_id="qhH5VOAvpCwvNpmn2srO",
            model_id="eleven_turbo_v2",
            output_format="mp3_44100_128"
        )
        audio_bytes = b"".join(chunk for chunk in audio_generator if chunk)
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