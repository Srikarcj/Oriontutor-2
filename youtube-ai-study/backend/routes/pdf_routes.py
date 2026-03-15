from typing import Any, Dict, List

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.llm.groq_client import get_groq_client
from backend.services.embedding_service import embed_texts

router = APIRouter()


class PdfQuestionRequest(BaseModel):
    document_id: str
    question: str


def _fetch_chunks(document_id: str) -> List[Dict[str, Any]]:
    import os

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.")

    url = f"{supabase_url}/rest/v1/pdf_chunks"
    params = {
        "select": "chunk",
        "document_id": f"eq.{document_id}",
        "limit": "80",
    }
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url, params=params, headers=headers)
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase fetch failed: {resp.text}")
        return resp.json() or []


@router.post("/ask")
async def ask_pdf(payload: PdfQuestionRequest) -> Dict[str, Any]:
    try:
        chunks = _fetch_chunks(payload.document_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF retrieval failed: {exc}")

    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for document.")

    texts = [c.get("chunk", "") for c in chunks if isinstance(c.get("chunk", ""), str)]
    if not texts:
        raise HTTPException(status_code=404, detail="No content found in document.")

    question_embedding = embed_texts([payload.question])[0]
    chunk_embeddings = embed_texts(texts)
    scores = np.dot(chunk_embeddings, question_embedding)
    top_indices = scores.argsort()[-5:][::-1]

    top_chunks = []
    for idx in top_indices:
        if scores[idx] < 0.2:
            continue
        top_chunks.append({"text": texts[idx], "score": float(scores[idx])})

    client = get_groq_client()
    if not top_chunks:
        answer = client.answer_general_question(payload.question)
        return {"answer": answer, "citations": []}

    answer = client.answer_question(question=payload.question, context_chunks=top_chunks)
    citations = [c["text"][:240] for c in top_chunks]
    return {"answer": answer, "citations": citations}
