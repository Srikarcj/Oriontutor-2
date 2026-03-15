from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.llm.groq_client import get_groq_client

router = APIRouter()


class LessonRequest(BaseModel):
    title: str
    summary: str | None = ""
    content: str | None = ""
    keywords: List[str] | None = None


class GradeRequest(BaseModel):
    question: str
    expected: str
    answer: str


@router.post("/generate")
async def generate_lesson(payload: LessonRequest) -> Dict[str, Any]:
    try:
        client = get_groq_client()
        package = client.generate_lesson_package(
            title=payload.title,
            summary=payload.summary or "",
            content=payload.content or "",
            keywords=payload.keywords or [],
        )
        return package
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lesson generation failed: {exc}")


@router.post("/grade")
async def grade_answer(payload: GradeRequest) -> Dict[str, Any]:
    try:
        client = get_groq_client()
        return client.grade_free_text_answer(payload.question, payload.expected, payload.answer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lesson grading failed: {exc}")
