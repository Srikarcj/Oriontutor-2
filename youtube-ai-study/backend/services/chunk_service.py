from dataclasses import dataclass
from typing import List, Dict

from backend.utils.text_cleaning import clean_transcript_text


@dataclass
class TranscriptChunk:
    """
    Represents a semantically coherent portion of the transcript.
    """

    id: int
    video_id: str
    text: str
    start: float
    end: float


def build_chunks(
    video_id: str,
    raw_entries: List[Dict],
    max_chars: int = 1200,
) -> List[TranscriptChunk]:
    """
    Group raw transcript entries into semantic-ish chunks by:
    - cleaning each entry text
    - aggregating until a character budget is reached
    - preserving approximate start / end timestamps per chunk
    """
    chunks: List[TranscriptChunk] = []
    buffer: List[str] = []
    current_start: float | None = None
    current_end: float | None = None
    current_len = 0
    chunk_id = 0

    for entry in raw_entries:
        raw_text: str = entry.get("text", "")
        cleaned = clean_transcript_text(raw_text)
        if not cleaned:
            continue

        start = float(entry.get("start", 0.0))
        duration = float(entry.get("duration", 0.0))
        end = start + duration

        if current_start is None:
            current_start = start

        # If adding this sentence would exceed the chunk budget, flush current chunk.
        if buffer and current_len + 1 + len(cleaned) > max_chars:
            chunk_text = " ".join(buffer)
            chunks.append(
                TranscriptChunk(
                    id=chunk_id,
                    video_id=video_id,
                    text=chunk_text,
                    start=current_start or 0.0,
                    end=current_end or current_start or 0.0,
                )
            )
            chunk_id += 1
            buffer = []
            current_len = 0
            current_start = start

        buffer.append(cleaned)
        current_len += len(cleaned) + 1
        current_end = end

    # Flush any remaining buffer
    if buffer:
        chunk_text = " ".join(buffer)
        chunks.append(
            TranscriptChunk(
                id=chunk_id,
                video_id=video_id,
                text=chunk_text,
                start=current_start or 0.0,
                end=current_end or current_start or 0.0,
            )
        )

    return chunks

