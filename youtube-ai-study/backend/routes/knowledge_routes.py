from typing import Any, Dict, List

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, constr
from starlette.responses import StreamingResponse

from backend.app.modules.learning.services.pdf_learning_service import (
    list_pdf_documents,
    delete_pdf_document,
)
from backend.services.knowledge_rag_service import answer_knowledge_question
from backend.app.modules.learning.services.supabase import SupabaseClient

router = APIRouter()


class KnowledgeAskRequest(BaseModel):
    question: constr(min_length=3, max_length=2000)
    course_slug: str | None = None
    pdf_document_ids: list[constr(min_length=32, max_length=36)] | None = None
    video_id: str | None = None
    conversation: list[dict] | None = None


def _require_user(x_user_id: str) -> str:
    if not x_user_id or len(x_user_id) > 128:
        raise HTTPException(status_code=401, detail="Unauthorized.")
    return x_user_id


@router.post("/ask")
async def ask_knowledge(
    payload: KnowledgeAskRequest,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    return await answer_knowledge_question(
        user_id=user_id,
        question=payload.question,
        course_slug=payload.course_slug,
        pdf_document_ids=payload.pdf_document_ids,
        video_id=payload.video_id,
        conversation=payload.conversation,
    )


@router.get("/stream")
async def stream_knowledge_answer(
    question: str = Query(..., min_length=3, max_length=2000),
    course_slug: str | None = Query(default=None),
    video_id: str | None = Query(default=None),
    x_user_id: str = Header(default="", alias="X-User-Id"),
):
    user_id = _require_user(x_user_id)
    result = await answer_knowledge_question(
        user_id=user_id,
        question=question,
        course_slug=course_slug,
        pdf_document_ids=None,
        video_id=video_id,
        conversation=None,
    )
    answer = result.get("answer", "")

    def _gen():
        chunk = ""
        for char in answer:
            chunk += char
            if len(chunk) >= 40:
                yield f"data: {chunk}\n\n"
                chunk = ""
        if chunk:
            yield f"data: {chunk}\n\n"
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(_gen(), media_type="text/event-stream")


@router.get("/documents")
async def list_documents(
    course_slug: str | None = Query(default=None),
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    docs = await list_pdf_documents(user_id, course_slug)
    return {"items": docs}


@router.delete("/documents/{document_id}")
async def remove_document(
    document_id: str,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    await delete_pdf_document(user_id, document_id)
    return {"ok": True}


@router.get("/videos")
async def list_videos(
    course_slug: str | None = Query(default=None),
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    sb = SupabaseClient()
    params = {"select": "id,title,ref_id,metadata,created_at", "user_id": f"eq.{user_id}", "item_type": "eq.youtube_video"}
    if course_slug:
        params["metadata->>course_slug"] = f"eq.{course_slug}"
    rows = await sb.get("user_library_items", params)
    return {"items": rows}


class VideoRegisterRequest(BaseModel):
    video_id: constr(min_length=6, max_length=64)
    title: constr(min_length=1, max_length=200)
    youtube_url: constr(min_length=8, max_length=2048)
    course_slug: str | None = None


@router.post("/videos/register")
async def register_video(
    payload: VideoRegisterRequest,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    sb = SupabaseClient()
    await sb.insert(
        "user_library_items",
        {
            "user_id": user_id,
            "item_type": "youtube_video",
            "title": payload.title,
            "ref_id": payload.video_id,
            "metadata": {"youtube_url": payload.youtube_url, "course_slug": payload.course_slug or ""},
        },
    )
    return {"ok": True}
