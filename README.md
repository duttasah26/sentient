# Sentient — BearHacks 2026

Point a camera at a room and every object in it becomes a character. YOLOv8 + MiDaS detect objects and estimate depth, each object gets its own persistent AI personality via a [Backboard.io](https://backboard.io) agent (memory carries across sessions), and [ElevenLabs](https://elevenlabs.io) gives it a voice. Tap an object in the live feed to open a chat/voice conversation with it.

## Architecture

- **`backend/`** — FastAPI service. Runs YOLOv8 object detection and MiDaS depth estimation on frames sent from the browser, manages an object→agent mapping in MongoDB, proxies chat to Backboard.io, and handles text-to-speech / speech-to-text via ElevenLabs.
- **`frontend/`** — React + Vite app. Streams webcam frames to the backend, overlays live bounding boxes, and renders a Windows-XP-styled chat UI for talking to detected objects.

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create `backend/.env` with:

```
ELEVENLABS_API_KEY=
CLOUD_VISION_API_KEY=
BACKBOARD_API_KEY=
MONGODB_URI=
MONGODB_DB=
MONGODB_COLLECTION=
```

Run the server:

```bash
python main.py
```

Runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`.

## Notes

- The backend downloads `yolov8m.pt` (YOLOv8) and MiDaS weights on first run/import.
- CORS is currently locked to `http://localhost:5173` — update `main.py` if you serve the frontend elsewhere.
