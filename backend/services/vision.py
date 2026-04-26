import base64, os
import httpx
from dotenv import load_dotenv

load_dotenv()

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"


async def get_vision_labels(image_bytes: bytes) -> list[str]:
    key = os.getenv("CLOUD_VISION_API_KEY")
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "requests": [{
            "image": {"content": b64},
            "features": [{"type": "LABEL_DETECTION", "maxResults": 15}],
        }]
    }
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.post(VISION_URL, params={"key": key}, json=payload)
        r.raise_for_status()
    annotations = r.json()["responses"][0].get("labelAnnotations", [])
    return [a["description"].lower() for a in annotations]


async def get_vision_objects_and_labels(image_bytes: bytes) -> tuple[list[dict], list[str]]:
    """OBJECT_LOCALIZATION + LABEL_DETECTION in one request. Returns (objects_with_boxes, scene_labels)."""
    key = os.getenv("CLOUD_VISION_API_KEY")
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "requests": [{
            "image": {"content": b64},
            "features": [
                {"type": "OBJECT_LOCALIZATION", "maxResults": 10},
                {"type": "LABEL_DETECTION",     "maxResults": 15},
            ],
        }]
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(VISION_URL, params={"key": key}, json=payload)
        r.raise_for_status()
    resp = r.json()["responses"][0]
    objects = []
    for obj in resp.get("localizedObjectAnnotations", []):
        verts = obj["boundingPoly"]["normalizedVertices"]
        xs = [v.get("x", 0) for v in verts]
        ys = [v.get("y", 0) for v in verts]
        objects.append({
            "name":  obj["name"].lower(),
            "score": round(obj["score"], 3),
            "box":   {"x1": min(xs), "y1": min(ys), "x2": max(xs), "y2": max(ys)},
        })
    labels = [a["description"].lower() for a in resp.get("labelAnnotations", [])]
    return objects, labels


def jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def match_fingerprint(query_labels: list[str], objects: list[dict]) -> tuple[dict | None, float]:
    query_set = set(query_labels)
    best, best_score = None, 0.0
    for obj in objects:
        stored = set(obj.get("vision_labels", []))
        if not stored:
            continue
        score = jaccard_similarity(query_set, stored)
        if score > best_score:
            best, best_score = obj, score
    return best, best_score
