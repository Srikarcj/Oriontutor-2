from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Query
from starlette.responses import StreamingResponse
from pydantic import BaseModel

from backend.vectorstore.faiss_store import VectorStoreError


router = APIRouter()


class QuestionRequest(BaseModel):
    video_id: str
    question: str


class QuestionResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=QuestionResponse)
async def ask_question(payload: QuestionRequest) -> Dict[str, Any]:
    """
    Answer a question about a previously processed video using RAG over FAISS.
    """
    try:
        # Lazy import avoids expensive model stack import during app startup.
        from backend.services.rag_service import answer_question_for_video
        answer = answer_question_for_video(video_id=payload.video_id, question=payload.question)
    except VectorStoreError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        # unexpected errors from LLM or embedding layer
        raise HTTPException(status_code=500, detail=f"QA pipeline failed: {exc}")

    return {"answer": answer}


@router.get("/stream")
async def stream_answer(video_id: str = Query(...), question: str = Query(...)):
    """
    Stream an answer as Server-Sent Events.
    """
    try:
        from backend.services.rag_service import answer_question_for_video
        answer = answer_question_for_video(video_id=video_id, question=question)
    except VectorStoreError as exc:
        return StreamingResponse(iter([f"data: {str(exc)}\n\n"]), media_type="text/event-stream")
    except Exception as exc:
        return StreamingResponse(iter([f"data: QA pipeline failed: {exc}\n\n"]), media_type="text/event-stream")

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

