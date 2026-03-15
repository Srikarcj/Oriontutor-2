import re
from typing import Dict, List


def _timestamp_to_seconds(label: str) -> float:
    parts = label.split(":")
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + int(s)
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + int(s)
    return 0.0


def _select_visual_type(text: str) -> str:
    lowered = text.lower()
    if any(k in lowered for k in ["diagram", "architecture", "flowchart", "pipeline"]):
        return "Diagram"
    if any(k in lowered for k in ["slide", "bullet", "presentation"]):
        return "Slide"
    if any(k in lowered for k in ["code", "function", "class", "api", "variable"]):
        return "Code"
    if any(k in lowered for k in ["chart", "graph", "plot", "curve"]):
        return "Chart"
    if any(k in lowered for k in ["equation", "formula", "theorem"]):
        return "Formula"
    if any(k in lowered for k in ["table", "dataset", "matrix"]):
        return "Table"
    if any(k in lowered for k in ["demo", "example", "experiment", "illustration"]):
        return "Demo"
    return "Key Moment"


def _extract_bullets(text: str, max_items: int = 3) -> List[str]:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if not sentences:
        return []
    return sentences[:max_items]


def generate_visual_insights(video_id: str, transcript_text: str) -> List[Dict]:
    """
    Heuristic visual insight extraction from timestamped transcript lines.
    """
    if not transcript_text:
        return []

    lines = [line.strip() for line in transcript_text.splitlines() if line.strip()]
    pattern = re.compile(r"^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.*)$")
    candidates: List[Dict] = []

    for line in lines:
        match = pattern.match(line)
        if not match:
            continue
        timestamp = match.group(1)
        text = match.group(2).strip()
        if not text:
            continue
        visual_type = _select_visual_type(text)
        if visual_type == "Key Moment" and len(text.split()) < 8:
            continue
        bullets = _extract_bullets(text)
        candidates.append(
            {
                "timestamp": timestamp,
                "seconds": _timestamp_to_seconds(timestamp),
                "visual_type": visual_type,
                "title": " ".join(text.split()[:6]).rstrip(",.") or visual_type,
                "ai_explanation": text,
                "bullets": bullets,
                "image_url": f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg",
                "tags": [visual_type],
            }
        )

    # Limit and mark key moments
    trimmed = candidates[:10]
    for idx, item in enumerate(trimmed):
        item["key_moment"] = idx < 3
    return trimmed
