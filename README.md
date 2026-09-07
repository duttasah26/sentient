# Sentient -- BearHacks 2026

Point a camera at a room and every object in it becomes a character. YOLOv8 + MiDaS detect objects and estimate depth, each object gets its own persistent AI personality via a [Backboard.io](https://backboard.io) agent (memory carries across sessions), and [ElevenLabs](https://elevenlabs.io) gives it a voice. Tap an object in the live feed to open a real-time chat or voice conversation with it.

[![Sentient Demo](https://img.youtube.com/vi/tCfI_cHyaTs/maxresdefault.jpg)](https://youtu.be/tCfI_cHyaTs)

---

## Architecture

- **`backend/`** -- FastAPI service. Runs YOLOv8 object detection and MiDaS depth estimation on frames sent from the browser, manages an object-to-agent mapping in MongoDB, proxies chat to Backboard.io, and handles text-to-speech via ElevenLabs.
- **`frontend/`** -- React + Vite app. Streams webcam frames to the backend, overlays live bounding boxes on detected objects, and opens a real-time conversation drawer when you tap one.

---

## Stack

| Layer | Tech |
|---|---|
| Object detection | YOLOv8m (Ultralytics) |
| Depth estimation | MiDaS Small |
| Agent + memory | Backboard.io |
| Voice | ElevenLabs Turbo v2 |
| Database | MongoDB (Motor async) |
| Backend | FastAPI + Python |
| Frontend | React + Vite |

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Create `backend/.env`:

```env
ELEVENLABS_API_KEY=
CLOUD_VISION_API_KEY=
BACKBOARD_API_KEY=
MONGODB_URI=
MONGODB_DB=bearhacks
MONGODB_COLLECTION=objects
```

Start the server:

```bash
python main.py
# http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## How It Works

1. **Scan** -- Hit Space or click "Scan Room". One frame is sent to the backend, YOLO detects all objects, MiDaS assigns each a depth score.
2. **Identify** -- Each detected YOLO label (e.g. `cup`, `book`) is looked up in MongoDB. If it has a Backboard agent already, that agent is reused. If not, one is created with a random personality.
3. **Talk** -- Click any detected object in the live feed. A conversation drawer opens over a WebSocket connection. Type or use the mic. ElevenLabs speaks the reply back.
4. **Remember** -- Backboard stores memories automatically across threads. The mug remembers what you said last time.

---

## Hardcoded Demo Objects

Four bedroom objects are seeded into MongoDB at startup so the demo works without needing to scan:

| Label | Name | Personality |
|---|---|---|
| `book` | The Tome | Ancient textbook haunted by exam panic |
| `cup` | Mug Maxwell | Deeply opinionated about brew temperature |
| `cell phone` | The Witness | Has seen everything, judges nothing |
| `laptop` | Crunch | Tired but loyal, has seen 10,000 deadlines |

---

## Notes

- `yolov8m.pt` and MiDaS weights download automatically on first run (approx. 170 MB total).
- CORS is locked to `http://localhost:5173` -- update `allow_origins` in `main.py` to deploy elsewhere.
- Speech recognition in the browser uses the Web Speech API (Chrome only). For broader support, swap in Whisper via the backend.
- The WebSocket at `/ws/chat/{yolo_label}` opens one Backboard thread per connection. Closing and reopening starts a new thread but the agent retains its long-term memory.

## Notes

- The backend downloads `yolov8m.pt` (YOLOv8) and MiDaS weights on first run/import.
- CORS is currently locked to `http://localhost:5173` — update `main.py` if you serve the frontend elsewhere.
