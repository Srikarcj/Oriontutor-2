import json
import os
from typing import Dict, Optional

from backend.config import get_settings


def _cache_path(video_id: str) -> str:
    settings = get_settings()
    os.makedirs(settings.cache_dir, exist_ok=True)
    safe_id = "".join(ch for ch in video_id if ch.isalnum() or ch in ("-", "_"))[:60]
    return os.path.join(settings.cache_dir, f"{safe_id}.json")


def _normalize_notes(notes: object, transcript: str, video_id: str) -> Dict:
    if not isinstance(notes, dict):
        return {
            "title": f"Study Notes ({video_id})",
            "overview": (transcript or "")[:1200],
            "main_concepts": [],
            "detailed_explanation": "",
            "examples": [],
            "key_takeaways": [],
        }
    return {
        "title": notes.get("title") or f"Study Notes ({video_id})",
        "overview": notes.get("overview") or (transcript or "")[:1200],
        "main_concepts": notes.get("main_concepts") or [],
        "detailed_explanation": notes.get("detailed_explanation") or "",
        "examples": notes.get("examples") or [],
        "key_takeaways": notes.get("key_takeaways") or [],
    }


def _migrate_payload(video_id: str, payload: Dict) -> Dict:
    transcript = payload.get("transcript") or ""
    payload["transcript"] = transcript
    payload["notes"] = _normalize_notes(payload.get("notes"), transcript, video_id)
    if not payload.get("summary"):
        payload["summary"] = payload["notes"].get("overview", "")
    if not isinstance(payload.get("flashcards"), list):
        payload["flashcards"] = None
    if not isinstance(payload.get("mindmap"), dict):
        payload["mindmap"] = None
    if not isinstance(payload.get("visual_insights"), list):
        payload["visual_insights"] = None
    return payload


def load_cached_video(video_id: str) -> Optional[Dict]:
    path = _cache_path(video_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            migrated = _migrate_payload(video_id, data)
            # persist migrated schema to avoid future validation errors
            save_cached_video(video_id, migrated)
            return migrated
        return None
    except Exception:
        return None


def save_cached_video(video_id: str, payload: Dict) -> None:
    path = _cache_path(video_id)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    except Exception:
        return
