import io
from typing import List
import logging
import traceback

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.config import get_settings

router = APIRouter()
logger = logging.getLogger("assistant")

MAX_FILES = 5
MAX_TEXT_CHARS = 12000
MAX_PROMPT_CHARS = 4000
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/json",
    "application/csv",
}
ALLOWED_IMAGE_PREFIX = "image/"
ALLOWED_TEXT_PREFIX = "text/"


def _safe_decode(payload: bytes) -> str:
    try:
        import chardet
        guess = chardet.detect(payload)
        encoding = guess.get("encoding") or "utf-8"
        return payload.decode(encoding, errors="ignore")
    except Exception:
        return payload.decode("utf-8", errors="ignore")


def _extract_pdf_text(payload: bytes) -> str:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(payload))
        chunks = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text:
                chunks.append(text)
        return "\n".join(chunks)
    except Exception:
        return ""


def _extract_image_text(payload: bytes) -> str:
    try:
        from PIL import Image
        import pytesseract
        with Image.open(io.BytesIO(payload)) as image:
            return pytesseract.image_to_string(image) or ""
    except Exception:
        return ""


@router.post("")
async def assistant(
    prompt: str = Form(...),
    uploads: List[UploadFile] = File([]),
):
    try:
        settings = get_settings()
        if not settings.groq_api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

        prompt = prompt.strip()
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required.")
        if len(prompt) > MAX_PROMPT_CHARS:
            raise HTTPException(status_code=413, detail="Prompt too large.")

        snippets = []
        image_names = []
        total_bytes = 0

        if len(uploads) > MAX_FILES:
            raise HTTPException(status_code=400, detail=f"Too many files. Max {MAX_FILES}.")

        for upload in uploads[:MAX_FILES]:
            payload = await upload.read()
            total_bytes += len(payload)
            if len(payload) > MAX_FILE_BYTES or total_bytes > MAX_TOTAL_BYTES:
                raise HTTPException(status_code=413, detail="Uploaded file(s) too large.")
            mime = upload.content_type or ""
            filename = upload.filename or "upload"

            if mime.startswith(ALLOWED_IMAGE_PREFIX):
                text = _extract_image_text(payload)
                if text:
                    snippets.append(f"Image: {filename}\n{text[:MAX_TEXT_CHARS]}")
                else:
                    image_names.append(filename)
                continue

            if mime == "application/pdf":
                text = _extract_pdf_text(payload)
                if text:
                    snippets.append(f"File: {filename}\n{text[:MAX_TEXT_CHARS]}")
                continue

            if mime.startswith(ALLOWED_TEXT_PREFIX) or mime in {"application/json", "application/csv"}:
                text = _safe_decode(payload)
                if text:
                    snippets.append(f"File: {filename}\n{text[:MAX_TEXT_CHARS]}")
                continue

            if mime not in ALLOWED_MIME_TYPES and not mime.startswith(ALLOWED_IMAGE_PREFIX) and not mime.startswith(ALLOWED_TEXT_PREFIX):
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime or 'unknown'}")

        if snippets:
            joined_snippets = "\n\n".join(snippets)
            attachments = f"\n\nAttached materials:\n{joined_snippets}"
        else:
            attachments = ""
        image_note = (
            f"\n\nImages uploaded but OCR could not read them: {', '.join(image_names)}"
            if image_names
            else ""
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an advanced tutor. Provide a clear, structured explanation "
                    "with a simple example and a quick check question."
                ),
            },
            {
                "role": "user",
                "content": f"{prompt}{attachments}{image_note}",
            },
        ]

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.groq_model,
                    "messages": messages,
                },
            )

        if response.status_code >= 400:
            logger.error("Groq error %s: %s", response.status_code, response.text)
            raise HTTPException(status_code=502, detail="Upstream AI request failed.")

        data = response.json()
        answer = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"answer": answer or "No answer returned."}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Assistant failed")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Assistant failed.")
