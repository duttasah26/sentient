import numpy as np
import torch
import torch.nn.functional as F
from ultralytics import YOLO

IGNORED_LABELS = {"chair", "table", "dining table", "couch", "sofa", "floor", "ceiling", "wall", "person"}
NEAR_THRESHOLD = 0.20
COOLDOWN_SECS  = 6
DEPTH_MARGIN   = 0.25
GRID_SIZE      = 8

yolo_model      = YOLO("yolov8m.pt")
midas_model     = None
midas_transform = None
midas_device    = None


def load_midas_model():
    """Load MiDaS depth model. Call once at startup — returns the device it loaded on."""
    global midas_model, midas_transform, midas_device
    midas_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    midas_model  = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", trust_repo=True)
    midas_model.to(midas_device).eval()
    transforms      = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
    midas_transform = transforms.small_transform
    return midas_device


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
