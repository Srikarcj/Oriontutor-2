from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import math
import time

import numpy as np

from backend.app.modules.learning.services.supabase import SupabaseClient
from backend.llm.groq_client import get_groq_client
from backend.services.embedding_service import embed_texts
from backend.vectorstore.faiss_store import load_video_index, search_video_chunks, VectorStoreError


def _normalize(text: str) -> List[str]:
    return [t for t in "".join([c.lower() if c.isalnum() else " " for c in text]).split() if t]


def _keyword_scores(chunks: List[Dict[str, Any]], query: str) -> Dict[int, float]:
    terms = _normalize(query)
    if not terms:
        return {}
    df: Dict[str, int] = {}
    for chunk in chunks:
        seen = set(_normalize(chunk.get("text", "")))
        for t in seen:
            df[t] = df.get(t, 0) + 1
    scores: Dict[int, float] = {}
    n = max(len(chunks), 1)
    for idx, chunk in enumerate(chunks):
        words = _normalize(chunk.get("text", ""))
        if not words:
            continue
        tf: Dict[str, int] = {}
        for w in words:
            tf[w] = tf.get(w, 0) + 1
        score = 0.0
        for term in terms:
            if term not in tf:
                continue
            idf = math.log((n + 1) / (df.get(term, 1) + 1)) + 1.0
            score += (tf[term] / max(len(words), 1)) * idf
        if score > 0:
            scores[idx] = score
    return scores


def _hybrid_retrieve(index_id: str, question: str, question_embedding: np.ndarray, top_k: int = 10) -> List[Dict[str, Any]]:
    try:
        vector_hits = search_video_chunks(index_id, question_embedding, top_k=top_k)
    except VectorStoreError:
        vector_hits = []

    try:
        _, metadata = load_video_index(index_id)
        chunks = metadata.get("chunks", []) or []
    except Exception:
        chunks = []

    keyword_scores = _keyword_scores(chunks, question)
    keyword_hits: List[Dict[str, Any]] = []
    if keyword_scores:
        top_items = sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        for idx, score in top_items:
            if idx < len(chunks):
                hit = chunks[idx].copy()
                hit["keyword_score"] = float(score)
                keyword_hits.append(hit)

    combined: Dict[str, Dict[str, Any]] = {}
    def _key(item: Dict[str, Any]) -> str:
        return f"{item.get('chunk_index', item.get('id', ''))}:{item.get('start', '')}:{item.get('page_number', '')}"

    for hit in vector_hits:
        key = _key(hit)
        combined[key] = hit.copy()
        combined[key]["vector_score"] = float(hit.get("score", 0.0))
    for hit in keyword_hits:
        key = _key(hit)
        base = combined.get(key, hit.copy())
        base["keyword_score"] = float(hit.get("keyword_score", 0.0))
        combined[key] = base

    results = list(combined.values())
    for item in results:
        v = float(item.get("vector_score", 0.0))
        k = float(item.get("keyword_score", 0.0))
        item["score"] = 0.7 * v + 0.3 * k
    results.sort(key=lambda x: x.get("score", 0.0), reverse=True)
    return results[:top_k]


def _rerank(chunks: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
    if not chunks:
        return []
    chunks.sort(key=lambda x: x.get("score", 0.0), reverse=True)
    return chunks[:top_n]


def _format_timestamp(seconds: float) -> str:
    total = int(round(seconds or 0.0))
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


async def rewrite_question(question: str, conversation: Optional[List[Dict[str, str]]] = None) -> str:
    client = get_groq_client()
    try:
        return client.rewrite_query(question, conversation or [])
    except Exception:
        return question


async def _list_pdf_documents(user_id: str, course_slug: Optional[str]) -> List[str]:
    sb = SupabaseClient()
    params: Dict[str, Any] = {"select": "id", "user_id": f"eq.{user_id}"}
    if course_slug:
        params["course_slug"] = f"eq.{course_slug}"
    rows = await sb.get("pdf_documents", params)
    return [str(r.get("id")) for r in rows if r.get("id")]


async def answer_knowledge_question(
    user_id: str,
    question: str,
    course_slug: Optional[str] = None,
    pdf_document_ids: Optional[List[str]] = None,
    video_id: Optional[str] = None,
    conversation: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    rewritten = await rewrite_question(question, conversation)
    question_embedding = embed_texts([rewritten])[0]

    if video_id:
        video_results = _hybrid_retrieve(video_id, rewritten, question_embedding, top_k=10)
        video_results = _rerank(video_results, top_n=5)
        if video_results:
            client = get_groq_client()
            answer = client.answer_question(question=question, context_chunks=video_results)
            sources = []
            for c in video_results:
                start = float(c.get("start", 0.0))
                sources.append(
                    {
                        "source_type": "video",
                        "title": c.get("title") or c.get("video_id"),
                        "timestamp": _format_timestamp(start),
                    }
                )
            return {"answer": answer, "sources": sources, "rewritten_question": rewritten}

    pdf_ids = pdf_document_ids or await _list_pdf_documents(user_id, course_slug)
    pdf_results: List[Dict[str, Any]] = []
    for doc_id in pdf_ids[:10]:
        pdf_results.extend(_hybrid_retrieve(f"pdf_{doc_id}", rewritten, question_embedding, top_k=10))

    pdf_results = _rerank(pdf_results, top_n=5)
    if pdf_results:
        client = get_groq_client()
        answer = client.answer_question(question=question, context_chunks=pdf_results)
        sources = []
        for c in pdf_results:
            sources.append(
                {
                    "source_type": "pdf",
                    "file_name": c.get("file_name"),
                    "page_number": c.get("page_number"),
                    "section_title": c.get("section_title"),
                }
            )
        return {"answer": answer, "sources": sources, "rewritten_question": rewritten}

    return {
        "answer": "I could not find this information in the uploaded document.",
        "sources": [],
        "rewritten_question": rewritten,
    }
