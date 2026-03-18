from typing import Any, Dict
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl, field_validator

from backend.services.transcript_service import get_clean_transcript, TranscriptError, extract_video_id
from backend.services.chunk_service import build_chunks
from backend.services.pdf_service import generate_notes_pdf
from backend.config import get_settings
from backend.vectorstore.faiss_store import VectorStoreError
from backend.services.cache_service import load_cached_video, save_cached_video
from backend.llm.groq_client import get_groq_client


router = APIRouter()


class VideoProcessRequest(BaseModel):
    youtube_url: HttpUrl

    @field_validator("youtube_url")
    @classmethod
    def validate_youtube_url(cls, value: HttpUrl) -> HttpUrl:
        host = value.host or ""
        allowed_hosts = {"www.youtube.com", "youtube.com", "youtu.be"}
        if host not in allowed_hosts:
            raise ValueError("Only YouTube URLs are allowed.")
        return value


class NotesSchema(BaseModel):
    title: str
    overview: str
    main_concepts: list[str]
    detailed_explanation: str
    examples: list[str]
    key_takeaways: list[str]


class VideoProcessResponse(BaseModel):
    video_id: str
    notes: NotesSchema
    transcript: str
    summary: str
    mindmap: dict | None = None
    flashcards: list[dict] | None = None
    visual_insights: list[dict] | None = None
    pdf_url: str


def _fallback_notes_from_transcript(transcript: str, video_id: str) -> Dict[str, Any]:
    text = re.sub(r"\s+", " ", (transcript or "").strip())
    overview = text[:1200] if text else "Transcript processed, but AI notes generation failed."
    chunks = [c.strip() for c in re.split(r"(?<=[.!?])\s+", text) if c.strip()]
    concepts = chunks[:5] if chunks else ["Main concept extraction unavailable"]
    takeaways = chunks[-3:] if len(chunks) >= 3 else concepts[:3]
    return {
        "title": f"Study Notes ({video_id})",
        "overview": overview,
        "main_concepts": concepts,
        "detailed_explanation": "Generated using fallback mode due temporary AI service issue.",
        "examples": [],
        "key_takeaways": takeaways,
    }


def _ensure_notes_schema(notes: Dict[str, Any] | None, transcript: str, video_id: str) -> Dict[str, Any]:
    if not isinstance(notes, dict):
        return _fallback_notes_from_transcript(transcript, video_id)
    return {
        "title": notes.get("title") or f"Study Notes ({video_id})",
        "overview": notes.get("overview") or (transcript[:1200] if transcript else ""),
        "main_concepts": notes.get("main_concepts") or [],
        "detailed_explanation": notes.get("detailed_explanation") or "",
        "examples": notes.get("examples") or [],
        "key_takeaways": notes.get("key_takeaways") or [],
    }


@router.post("/process", response_model=VideoProcessResponse)
async def process_video(request: VideoProcessRequest) -> Dict[str, Any]:
    """
    End-to-end video processing:
    - fetch + clean transcript
    - chunk transcript
    - generate embeddings & persist in FAISS
    - call Groq to generate structured notes
    - render a PDF and expose its URL
    """
    video_id = ""
    try:
        video_id = extract_video_id(str(request.youtube_url))
    except TranscriptError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    cached = load_cached_video(video_id)
    if cached and cached.get("notes") and cached.get("transcript"):
        cached_transcript = cached.get("transcript", "")
        safe_notes = _ensure_notes_schema(cached.get("notes"), cached_transcript, video_id)
        return {
            "video_id": cached.get("video_id", video_id),
            "notes": safe_notes,
            "transcript": cached_transcript,
            "summary": cached.get("summary", "") or safe_notes.get("overview", ""),
            "mindmap": cached.get("mindmap", None),
            "flashcards": cached.get("flashcards", None),
            "visual_insights": cached.get("visual_insights", None),
            "pdf_url": cached.get("pdf_url", ""),
        }

    try:
        transcript_payload = get_clean_transcript(str(request.youtube_url))
    except TranscriptError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Transcript processing failed.")

    video_id = transcript_payload["video_id"]
    raw_entries = transcript_payload["raw_entries"]
    cleaned_text: str = transcript_payload["cleaned_text"]
    timestamped_text: str = transcript_payload.get("timestamped_text", cleaned_text)

    # Lazy import keeps app startup fast and avoids long cold-start on /health and /docs.
    from backend.services.rag_service import index_video_transcript, generate_notes_from_transcript

    # Build semantic chunks and index them
    try:
        chunks = build_chunks(video_id=video_id, raw_entries=raw_entries)
        if not chunks:
            raise HTTPException(status_code=400, detail="Transcript was fetched but produced no usable text chunks.")
        index_video_transcript(video_id=video_id, chunks=chunks, title=f"Lecture {video_id}")
    except VectorStoreError as exc:
        # Do not block note generation if vector indexing fails.
        print(f"WARNING: Vector index operation failed for {video_id}: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        # Keep processing path alive; QA may be unavailable for this video.
        print(f"WARNING: Chunking/embedding failed for {video_id}: {exc}")

    # Generate structured notes from the full cleaned transcript text
    try:
        notes_dict = generate_notes_from_transcript(cleaned_text)
    except Exception as exc:
        print(f"WARNING: LLM notes generation failed for {video_id}: {exc}")
        notes_dict = _fallback_notes_from_transcript(cleaned_text, video_id=video_id)

    # Generate concise summary
    summary_text = ""
    try:
        client = get_groq_client()
        summary_text = client.summarise_video(cleaned_text)
    except Exception as exc:
        print(f"WARNING: LLM summary generation failed for {video_id}: {exc}")
        summary_text = notes_dict.get("overview", "")

    # Generate mind map + flashcards
    mindmap_payload = None
    flashcards_payload = None
    try:
        client = get_groq_client()
        mindmap_payload = client.generate_mindmap(notes_dict, summary_text, cleaned_text)
        flashcards_payload = client.generate_flashcards(notes_dict, summary_text, cleaned_text)
    except Exception as exc:
        print(f"WARNING: Mindmap/flashcards generation failed for {video_id}: {exc}")

    # Generate visual insights (lightweight heuristic extraction)
    visual_insights_payload = None
    try:
        from backend.services.visual_insights_service import generate_visual_insights
        visual_insights_payload = generate_visual_insights(video_id=video_id, transcript_text=timestamped_text)
    except Exception as exc:
        print(f"WARNING: Visual insights generation failed for {video_id}: {exc}")

    # Generate PDF
    pdf_url = ""
    try:
        pdf_path = generate_notes_pdf(video_id=video_id, notes=notes_dict, summary=summary_text, transcript=cleaned_text)
        settings = get_settings()
        pdf_filename = pdf_path.replace(settings.pdf_output_dir, "").lstrip("\\/")  # normalise for URL
        pdf_url = f"/static/{pdf_filename}"
    except Exception as exc:
        print(f"WARNING: PDF generation failed for {video_id}: {exc}")

    save_cached_video(
        video_id,
        {
            "video_id": video_id,
            "notes": notes_dict,
            "transcript": timestamped_text,
            "summary": summary_text,
            "mindmap": mindmap_payload,
            "flashcards": flashcards_payload,
            "visual_insights": visual_insights_payload,
            "pdf_url": pdf_url,
        },
    )

    return {
        "video_id": video_id,
        "notes": notes_dict,
        "transcript": timestamped_text,
        "summary": summary_text,
        "mindmap": mindmap_payload,
        "flashcards": flashcards_payload,
        "visual_insights": visual_insights_payload,
        "pdf_url": pdf_url,
    }

