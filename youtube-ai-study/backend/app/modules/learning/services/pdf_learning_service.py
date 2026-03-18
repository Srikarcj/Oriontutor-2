from typing import Any, Dict, List, Optional

import io
import numpy as np
from PyPDF2 import PdfReader
import hashlib
import time

from backend.app.modules.learning.services.supabase import SupabaseClient
from backend.llm.groq_client import get_groq_client
from backend.services.embedding_service import embed_texts
from backend.vectorstore.faiss_store import save_video_index, search_video_chunks, VectorStoreError


def _token_count(text: str) -> int:
    return len([w for w in text.split() if w.strip()])


def _is_heading(line: str) -> bool:
    if not line:
        return False
    if line.startswith("#"):
        return True
    if line.endswith(":") and len(line.split()) <= 10:
        return True
    if line.isupper() and len(line) <= 80:
        return True
    return False


def _split_sections(page_text: str) -> List[Dict[str, str]]:
    lines = [line.strip() for line in page_text.splitlines()]
    sections: List[Dict[str, str]] = []
    current_title = ""
    buffer: List[str] = []

    def flush():
        nonlocal buffer
        text = "\n".join([b for b in buffer if b])
        if text.strip():
            sections.append({"title": current_title, "text": text.strip()})
        buffer = []

    for line in lines:
        if not line:
            if buffer:
                buffer.append("")
            continue
        if _is_heading(line):
            flush()
            current_title = line.lstrip("#").strip()
            continue
        buffer.append(line)
    flush()
    return sections


def _semantic_chunk_pages(pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    target_words = 520
    min_words = 320
    max_words = 650
    overlap_words = 70

    for page in pages:
        page_number = page.get("page_number")
        text = page.get("text") or ""
        if not text.strip():
            continue
        sections = _split_sections(text)
        for sec in sections:
            words = [w for w in sec["text"].split() if w.strip()]
            idx = 0
            while idx < len(words):
                remaining = len(words) - idx
                size = min(max_words, max(min_words, min(target_words, remaining)))
                slice_words = words[idx : idx + size]
                chunk_text = " ".join(slice_words).strip()
                if chunk_text:
                    chunks.append(
                        {
                            "text": chunk_text,
                            "page_number": page_number,
                            "section_title": sec.get("title") or None,
                        }
                    )
                if idx + size >= len(words):
                    break
                idx = max(0, idx + size - overlap_words)
    return chunks


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts: List[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text:
            text_parts.append(page_text)
    return "\n\n".join(text_parts)


def _extract_pages(file_bytes: bytes) -> List[Dict[str, Any]]:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages: List[Dict[str, Any]] = []
    for idx, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        pages.append({"page_number": idx, "text": page_text})
    return pages


async def create_pdf_document(user_id: str, filename: str, file_bytes: bytes, course_slug: Optional[str] = None) -> Dict[str, Any]:
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    course_slug = course_slug or ""
    sb = SupabaseClient()

    existing = await sb.get(
        "pdf_documents",
        {
            "select": "id,name",
            "user_id": f"eq.{user_id}",
            "file_hash": f"eq.{file_hash}",
            "course_slug": f"eq.{course_slug}",
            "limit": "1",
        },
    )
    if existing:
        doc = existing[0]
        return {"id": doc.get("id"), "name": doc.get("name") or filename, "cached": True}

    pages = _extract_pages(file_bytes)
    text = "\n\n".join([p.get("text", "") for p in pages if p.get("text")])
    doc_rows = await sb.insert(
        "pdf_documents",
        {"user_id": user_id, "name": filename, "text": text, "course_slug": course_slug, "file_hash": file_hash},
    )
    if not doc_rows:
        raise RuntimeError("Failed to create PDF document")

    doc = doc_rows[0]
    doc_id = doc.get("id")
    if not doc_id:
        raise RuntimeError("Missing document id")

    chunks = _semantic_chunk_pages(pages)
    if chunks:
        embeddings = embed_texts([c["text"] for c in chunks])
        uploaded_at = int(time.time())
        meta = [
            {
                "document_id": doc_id,
                "chunk_index": idx,
                "text": chunk.get("text"),
                "source_type": "pdf",
                "file_name": filename,
                "course_slug": course_slug,
                "page_number": chunk.get("page_number"),
                "section_title": chunk.get("section_title"),
                "uploaded_at": uploaded_at,
                "user_id": user_id,
            }
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
                    "chunk_text": chunk.get("text"),
                    "source_type": "pdf",
                    "file_name": filename,
                    "course_slug": course_slug,
                    "page_number": chunk.get("page_number"),
                    "section_title": chunk.get("section_title"),
                    "uploaded_at": uploaded_at,
                    "user_id": user_id,
                    "embedding": embedding_list,
                }
            )
        if payload:
            await sb.insert("pdf_embeddings", payload)
            await sb.update("pdf_documents", {"indexed_at": "now()"}, {"id": doc_id})

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

    return {"id": doc_id, "name": filename, "cached": False}


async def list_pdf_documents(user_id: str, course_slug: Optional[str] = None) -> List[Dict[str, Any]]:
    sb = SupabaseClient()
    params: Dict[str, Any] = {"select": "id,name,created_at,course_slug,indexed_at,file_hash", "user_id": f"eq.{user_id}"}
    if course_slug:
        params["course_slug"] = f"eq.{course_slug}"
    return await sb.get("pdf_documents", params)


async def delete_pdf_document(user_id: str, document_id: str) -> None:
    sb = SupabaseClient()
    rows = await sb.get(
        "pdf_documents",
        {"select": "id", "id": f"eq.{document_id}", "user_id": f"eq.{user_id}", "limit": "1"},
    )
    if not rows:
        raise RuntimeError("Document not found")
    await sb.delete("pdf_embeddings", {"document_id": document_id})
    await sb.delete("pdf_documents", {"id": document_id})
    await sb.delete("library_items", {"ref_id": document_id})
    from backend.vectorstore.faiss_store import delete_video_index
    delete_video_index(f"pdf_{document_id}")


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
        return {"answer": "I could not find this information in the uploaded document.", "citations": []}

    top_score = max((chunk.get("score", 0.0) for chunk in retrieved), default=0.0)
    if top_score < 0.25:
        return {"answer": "I could not find this information in the uploaded document.", "citations": []}

    client = get_groq_client()
    answer = client.answer_question_strict(question=question, context_chunks=retrieved)
    citations = []
    for c in retrieved:
        citations.append(
            {
                "source_type": "pdf",
                "file_name": c.get("file_name"),
                "page_number": c.get("page_number"),
                "section_title": c.get("section_title"),
                "snippet": (c.get("text") or "")[:240],
            }
        )
    return {"answer": answer, "citations": citations}

