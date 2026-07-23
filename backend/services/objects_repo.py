import random
import time

from . import backboard
from .detection import sample_depth
from .seed_data import DEFAULT_VOICES, DEFAULT_PERSONALITIES, HARDCODED_OBJECTS


async def seed_hardcoded_objects(db_collection):
    for obj in HARDCODED_OBJECTS:
        existing = await db_collection.find_one({"yolo_label": obj["yolo_label"]})
        if not existing:
            await db_collection.insert_one({**obj, "created_at": time.time()})
            print(f"Seeded: {obj['name']} ({obj['yolo_label']})")


async def ensure_assistant(db_collection, yolo_label: str) -> dict:
    """Fetch (or create) the DB doc + Backboard assistant for an object."""
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
        asst_id = await backboard.create_assistant(doc["name"], doc["backstory"])
        await db_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"backboard_assistant_id": asst_id}},
        )
        doc["backboard_assistant_id"] = asst_id
        print(f"Created Backboard agent for {doc['name']}: {asst_id}")

    return doc


async def enrich_detection(db_collection, det: dict, depth_map) -> dict:
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
