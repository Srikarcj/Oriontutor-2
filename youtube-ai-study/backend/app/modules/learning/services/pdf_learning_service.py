from typing import Any, Dict, List

import io
import numpy as np
from PyPDF2 import PdfReader

from backend.app.modules.learning.services.supabase import SupabaseClient
from backend.llm.groq_client import get_groq_client
from backend.services.embedding_service import embed_texts
from backend.vectorstore.faiss_store import save_video_index, search_video_chunks, VectorStoreError


def _chunk_text(text: str, size: int = 900) -> List[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    buffer = ""
    for para in paragraphs:
        if len(buffer) + len(para) + 1 > size:
            if buffer:
                chunks.append(buffer)
            buffer = para
        else:
            buffer = f"{buffer} {para}".strip()
    if buffer:
        chunks.append(buffer)
    return chunks


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts: List[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text:
            text_parts.append(page_text)
    return "\n\n".join(text_parts)


async def create_pdf_document(user_id: str, filename: str, file_bytes: bytes) -> Dict[str, Any]:
    text = extract_text_from_pdf(file_bytes)
    sb = SupabaseClient()
    doc_rows = await sb.insert("pdf_documents", {"user_id": user_id, "name": filename, "text": text})
    if not doc_rows:
        raise RuntimeError("Failed to create PDF document")

    doc = doc_rows[0]
    doc_id = doc.get("id")
    if not doc_id:
        raise RuntimeError("Missing document id")

    chunks = _chunk_text(text)
    if chunks:
        embeddings = embed_texts(chunks)
        meta = [
            {"document_id": doc_id, "chunk_index": idx, "text": chunk}
            for idx, chunk in enumerate(chunks)
        ]
        save_video_index(video_id=f"pdf_{doc_id}", embeddings=embeddings, chunks=meta)

        payload = []
        for idx, chunk in enumerate(chunks):
            embedding_list = embeddings[idx].astype("float32").tolist()
            payload.append(
                {
                    "document_id": doc_id,
                    "chunk_index": idx,
                    "chunk_text": chunk,
                    "embedding": embedding_list,
                }
            )
        if payload:
            await sb.insert("pdf_embeddings", payload)

    await sb.insert(
        "library_items",
        {
            "user_id": user_id,
            "item_type": "uploaded_pdf",
            "title": filename,
            "ref_id": doc_id,
            "metadata": {"summary": text[:240]},
        },
    )

    return {"id": doc_id, "name": filename}


async def answer_pdf_question(document_id: str, question: str) -> Dict[str, Any]:
    try:
        question_embedding = embed_texts([question])[0]
        retrieved = search_video_chunks(
            f"pdf_{document_id}",
            np.asarray(question_embedding, dtype="float32"),
            top_k=5,
        )
    except VectorStoreError:
        retrieved = []

    if not retrieved:
        client = get_groq_client()
        answer = client.answer_general_question(question)
        return {"answer": answer, "citations": []}

    top_score = max((chunk.get("score", 0.0) for chunk in retrieved), default=0.0)
    if top_score < 0.25:
        client = get_groq_client()
        answer = client.answer_general_question(question)
        return {"answer": answer, "citations": []}

    client = get_groq_client()
    answer = client.answer_question(question=question, context_chunks=retrieved)
    citations = [c.get("text", "")[:240] for c in retrieved]
    return {"answer": answer, "citations": citations}

