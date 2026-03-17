from typing import Dict, List, Tuple
import time

import numpy as np
from backend.llm.groq_client import get_groq_client
from backend.services.embedding_service import embed_texts
from backend.services.chunk_service import TranscriptChunk, build_chunks
from backend.services.cache_service import load_cached_video
from backend.vectorstore.faiss_store import save_video_index, search_video_chunks, load_video_index, VectorStoreError

_ANSWER_CACHE: Dict[str, Tuple[str, float]] = {}
_ANSWER_CACHE_TTL_SECONDS = 300

def _cache_key(video_id: str, question: str, suffix: str = "") -> str:
    base = f"{video_id}::{question.strip().lower()}"
    return f"{base}::{suffix}" if suffix else base

def _get_cached_answer(video_id: str, question: str, suffix: str = "") -> str | None:
    key = _cache_key(video_id, question, suffix)
    entry = _ANSWER_CACHE.get(key)
    if not entry:
        return None
    answer, ts = entry
    if (time.time() - ts) > _ANSWER_CACHE_TTL_SECONDS:
        _ANSWER_CACHE.pop(key, None)
        return None
    return answer

def _set_cached_answer(video_id: str, question: str, answer: str, suffix: str = "") -> None:
    _ANSWER_CACHE[_cache_key(video_id, question, suffix)] = (answer, time.time())

def _trim_chunks(chunks: List[Dict], max_chars: int = 900) -> List[Dict]:
    trimmed: List[Dict] = []
    for chunk in chunks:
        copy = chunk.copy()
        text = copy.get("text", "")
        if isinstance(text, str) and len(text) > max_chars:
            copy["text"] = text[:max_chars]
        trimmed.append(copy)
    return trimmed


def _search_pdf_chunks(document_ids: List[str], question_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
    chunks: List[Dict] = []
    if not document_ids:
        return chunks
    for doc_id in document_ids[:10]:
        try:
            retrieved = search_video_chunks(
                f"pdf_{doc_id}",
                np.asarray(question_embedding, dtype="float32"),
                top_k=top_k,
            )
            for item in retrieved:
                item["source"] = "pdf"
            chunks.extend(retrieved)
        except VectorStoreError:
            continue
    return chunks


def index_video_transcript(video_id: str, chunks: List[TranscriptChunk]) -> None:
    """
    Given cleaned transcript chunks, generate embeddings and persist to FAISS for this video.
    """
    texts = [c.text for c in chunks]
    embeddings = embed_texts(texts)

    chunk_meta: List[Dict] = []
    for c in chunks:
        chunk_meta.append(
            {
                "id": c.id,
                "video_id": c.video_id,
                "text": c.text,
                "start": c.start,
                "end": c.end,
            }
        )

    save_video_index(video_id=video_id, embeddings=embeddings, chunks=chunk_meta)


def generate_notes_from_transcript(transcript_text: str) -> Dict:
    """
    Use Groq LLM to turn transcript text into structured notes.
    """
    client = get_groq_client()
    notes = client.generate_structured_notes(transcript_text)
    return notes


def answer_question_for_video(video_id: str, question: str, top_k: int = 5) -> str:
    """
    Full RAG pipeline for a single question:
    - create question embedding
    - retrieve relevant chunks from FAISS
    - send as context to Groq for answer generation
    """
    cached = _get_cached_answer(video_id, question)
    if cached:
        return cached

    timestamp_match = _parse_timestamp_question(question)
    if timestamp_match:
        answer = _answer_timestamp_question(video_id, question, timestamp_match)
        _set_cached_answer(video_id, question, answer)
        return answer

    # Ensure an index exists (rebuild from cached transcript if needed)
    _ensure_index_for_video(video_id)

    # Embed the question
    question_embedding = embed_texts([question])
    # search_video_chunks handles loading the index
    try:
        retrieved_chunks = search_video_chunks(
            video_id,
            np.asarray(question_embedding[0], dtype="float32"),
            top_k=top_k,
        )
    except VectorStoreError:
        retrieved_chunks = []

    if not retrieved_chunks:
        client = get_groq_client()
        answer = client.answer_general_question(question=question)
        _set_cached_answer(video_id, question, answer)
        return answer

    top_score = max((c.get("score", 0.0) for c in retrieved_chunks), default=0.0)
    if top_score < 0.25:
        client = get_groq_client()
        answer = client.answer_general_question(question=question)
        _set_cached_answer(video_id, question, answer)
        return answer

    client = get_groq_client()
    trimmed = _trim_chunks(retrieved_chunks)
    answer = client.answer_question(question=question, context_chunks=trimmed)
    _set_cached_answer(video_id, question, answer)
    return answer


def answer_question_multi(video_id: str, question: str, pdf_document_ids: List[str], top_k: int = 5) -> str:
    """
    RAG over video transcript chunks + PDF chunks.
    """
    cached = _get_cached_answer(video_id, question)
    if cached:
        return cached

    # Ensure video index exists
    _ensure_index_for_video(video_id)

    # Video chunks
    try:
        question_embedding = embed_texts([question])
        video_chunks = search_video_chunks(
            video_id,
            np.asarray(question_embedding[0], dtype="float32"),
            top_k=top_k,
        )
    except Exception:
        video_chunks = []

    # PDF chunks from shared vector store
    pdf_context = _search_pdf_chunks(pdf_document_ids, question_embedding[0], top_k=top_k)

    combined = _trim_chunks(video_chunks + pdf_context)
    if not combined:
        client = get_groq_client()
        answer = client.answer_general_question(question=question)
        _set_cached_answer(video_id, question, answer)
        return answer

    client = get_groq_client()
    answer = client.answer_question(question=question, context_chunks=combined)
    _set_cached_answer(video_id, question, answer)
    return answer


def _parse_timestamp_question(question: str) -> float | None:
    import re

    match = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", question)
    if not match:
        return None
    h = match.group(3)
    m = int(match.group(1))
    s = int(match.group(2))
    if h:
        return int(h) * 3600 + m * 60 + s
    return m * 60 + s


def _answer_timestamp_question(video_id: str, question: str, seconds: float) -> str:
    _ensure_index_for_video(video_id)
    try:
        _, metadata = load_video_index(video_id)
    except Exception:
        client = get_groq_client()
        return client.answer_general_question(question=question)

    chunks: List[Dict] = metadata.get("chunks", [])
    if not chunks:
        client = get_groq_client()
        return client.answer_general_question(question=question)

    def _mid(c: Dict) -> float:
        return float(c.get("start", 0.0) + c.get("end", 0.0)) / 2.0

    # Find chunks nearest to the timestamp
    sorted_chunks = sorted(chunks, key=lambda c: abs(_mid(c) - seconds))
    selected = sorted_chunks[:3]
    context = "\n\n".join(c.get("text", "") for c in selected if c.get("text"))
    mm = int(seconds // 60)
    ss = int(seconds % 60)
    label = f"{mm:02d}:{ss:02d}"
    client = get_groq_client()
    return client.summarize_context_at_time(question=question, context=context, timestamp_label=label)


def _ensure_index_for_video(video_id: str) -> bool:
    try:
        load_video_index(video_id)
        return True
    except VectorStoreError:
        pass
    except Exception:
        return False

    cached = load_cached_video(video_id)
    if not cached:
        return False
    transcript = cached.get("transcript") or ""
    if not isinstance(transcript, str) or not transcript.strip():
        return False

    raw_entries = _transcript_to_entries(transcript)
    if not raw_entries:
        return False

    try:
        chunks = build_chunks(video_id=video_id, raw_entries=raw_entries)
        if not chunks:
            return False
        index_video_transcript(video_id=video_id, chunks=chunks)
        return True
    except Exception:
        return False


def _transcript_to_entries(transcript: str) -> List[Dict]:
    import re

    lines = [line.strip() for line in transcript.splitlines() if line.strip()]
    entries: List[Dict] = []
    time_pattern = re.compile(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.*)$")

    for line in lines:
        match = time_pattern.match(line)
        if not match:
            continue
        h = match.group(3)
        m = int(match.group(1))
        s = int(match.group(2))
        if h:
            start = int(h) * 3600 + m * 60 + s
        else:
            start = m * 60 + s
        text = match.group(4).strip()
        if not text:
            continue
        entries.append({"text": text, "start": float(start), "duration": 4.0})

    if entries:
        # Estimate duration based on next start
        for idx in range(len(entries) - 1):
            cur = entries[idx]
            nxt = entries[idx + 1]
            cur["duration"] = max(2.0, float(nxt["start"]) - float(cur["start"]))
        return entries

    # Fallback: chunk plain text without timestamps
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
    if not sentences:
        return []
    start = 0.0
    for sentence in sentences:
        entries.append({"text": sentence, "start": start, "duration": 4.0})
        start += 4.0
    return entries

