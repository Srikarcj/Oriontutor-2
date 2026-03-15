from typing import List, Dict
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound


class TranscriptError(Exception):
    """Raised when a transcript cannot be fetched or processed."""


def extract_video_id(youtube_url: str) -> str:
    """
    Extract the YouTube video ID from a variety of URL formats.
    """
    parsed = urlparse(youtube_url)

    # Standard watch URL
    if parsed.hostname in {"www.youtube.com", "youtube.com"}:
        query = parse_qs(parsed.query)
        if "v" in query:
            return query["v"][0]

    # Short youtu.be URL
    if parsed.hostname == "youtu.be":
        return parsed.path.lstrip("/")

    # Fallback: last path segment
    path_parts = [p for p in parsed.path.split("/") if p]
    if path_parts:
        return path_parts[-1]

    raise TranscriptError("Could not extract YouTube video ID from URL.")


def fetch_raw_transcript(video_id: str, language_preference: List[str] | None = None) -> List[Dict]:
    """
    Fetch the raw transcript entries from YouTube.
    Each entry has fields: text, start, duration.
    """
    language_preference = language_preference or ["en", "en-US"]
    try:
        # youtube-transcript-api >=1.0 uses instance methods (`list`, `fetch`)
        api = YouTubeTranscriptApi()
        if hasattr(api, "list"):
            transcript_list = api.list(video_id)
            # Try preferred languages first, then fall back to generated
            for lang in language_preference:
                try:
                    fetched = transcript_list.find_manually_created_transcript([lang]).fetch()
                    return fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else list(fetched)
                except (NoTranscriptFound, TranscriptsDisabled):
                    continue
            try:
                fetched = transcript_list.find_transcript(language_preference).fetch()
                return fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else list(fetched)
            except (NoTranscriptFound, TranscriptsDisabled):
                # Final fallback: use any available transcript language.
                for transcript in transcript_list:
                    try:
                        fetched = transcript.fetch()
                        return fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else list(fetched)
                    except Exception:
                        continue
                raise TranscriptError("No transcript available for this video.")

        # youtube-transcript-api 0.x used class/static methods (`list_transcripts`)
        transcript = YouTubeTranscriptApi.list_transcripts(video_id)
        for lang in language_preference:
            try:
                return transcript.find_manually_created_transcript([lang]).fetch()
            except (NoTranscriptFound, TranscriptsDisabled):
                continue
        try:
            return transcript.find_transcript(language_preference).fetch()
        except (NoTranscriptFound, TranscriptsDisabled):
            for t in transcript:
                try:
                    return t.fetch()
                except Exception:
                    continue
            raise TranscriptError("No transcript available for this video.")
    except (TranscriptsDisabled, NoTranscriptFound) as exc:
        raise TranscriptError("Transcripts are disabled or unavailable for this video.") from exc
    except Exception as exc:  # pragma: no cover - defensive
        # Keep root cause visible to API callers for faster debugging in dev.
        raise TranscriptError(f"Failed to fetch transcript from YouTube: {exc}") from exc


def get_clean_transcript(youtube_url: str) -> dict:
    """
    High-level helper:
    - extract video ID
    - fetch transcript
    - clean transcript text
    Returns a dict with video_id, raw segments, cleaned_text.
    """
    video_id = extract_video_id(youtube_url)
    raw_entries = fetch_raw_transcript(video_id)

    # Preserve transcript text as close as possible to source captions.
    lines: List[str] = [str(entry.get("text", "")).replace("\n", " ").strip() for entry in raw_entries]
    cleaned_lines = [line for line in lines if line]
    cleaned_text = " ".join(cleaned_lines)

    # Timestamped transcript for UI
    def _format_ts(seconds: float) -> str:
        total = int(seconds or 0)
        mins = total // 60
        secs = total % 60
        return f"{mins:02d}:{secs:02d}"

    timestamped_lines: List[str] = []
    for entry in raw_entries:
        text = str(entry.get("text", "")).replace("\n", " ").strip()
        if not text:
            continue
        start = entry.get("start", 0)
        timestamped_lines.append(f"{_format_ts(start)} {text}")
    timestamped_text = "\n".join(timestamped_lines)

    return {
        "video_id": video_id,
        "raw_entries": raw_entries,
        "cleaned_text": cleaned_text,
        "timestamped_text": timestamped_text,
    }

