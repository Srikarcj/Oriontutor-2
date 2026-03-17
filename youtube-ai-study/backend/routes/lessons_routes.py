from typing import Any, Dict, List

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, constr

from backend.llm.groq_client import get_groq_client

router = APIRouter()
logger = logging.getLogger("lessons")


class LessonRequest(BaseModel):
    title: constr(min_length=1, max_length=200)
    summary: constr(max_length=5000) | None = ""
    content: constr(max_length=12000) | None = ""
    keywords: List[constr(min_length=1, max_length=40)] | None = None


class GradeRequest(BaseModel):
    question: constr(min_length=3, max_length=1000)
    expected: constr(min_length=1, max_length=2000)
    answer: constr(min_length=1, max_length=2000)


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
        logger.exception("Lesson generation failed")
        raise HTTPException(status_code=500, detail="Lesson generation failed.")


@router.post("/grade")
async def grade_answer(payload: GradeRequest) -> Dict[str, Any]:
    try:
        client = get_groq_client()
        return client.grade_free_text_answer(payload.question, payload.expected, payload.answer)
    except Exception as exc:
        logger.exception("Lesson grading failed")
        raise HTTPException(status_code=500, detail="Lesson grading failed.")
