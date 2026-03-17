from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel, constr

from backend.app.modules.learning.services.pdf_learning_service import create_pdf_document, answer_pdf_question

router = APIRouter()


class PdfQuestionRequest(BaseModel):
    document_id: constr(min_length=32, max_length=36)
    question: constr(min_length=3, max_length=2000)


MAX_PDF_BYTES = 8 * 1024 * 1024


def _assert_document_owner(document_id: str, user_id: str) -> None:
    import os

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.")

    url = f"{supabase_url}/rest/v1/pdf_documents"
    params = {"select": "id", "id": f"eq.{document_id}", "user_id": f"eq.{user_id}"}
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url, params=params, headers=headers)
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase fetch failed: {resp.text}")
        rows = resp.json() or []
        if not rows:
            raise HTTPException(status_code=404, detail="Document not found.")


@router.post("/ask")
async def ask_pdf(
    payload: PdfQuestionRequest,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    try:
        if not x_user_id or len(x_user_id) > 128:
            raise HTTPException(status_code=401, detail="Unauthorized.")
        _assert_document_owner(payload.document_id, x_user_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="PDF retrieval failed.")

    try:
        return await answer_pdf_question(payload.document_id, payload.question)
    except Exception:
        raise HTTPException(status_code=500, detail="PDF QA failed.")


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    if not x_user_id or len(x_user_id) > 128:
        raise HTTPException(status_code=401, detail="Unauthorized.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    data = await file.read()
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="File too large.")

    try:
        result = await create_pdf_document(x_user_id, file.filename or "document.pdf", data)
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to process PDF.")
