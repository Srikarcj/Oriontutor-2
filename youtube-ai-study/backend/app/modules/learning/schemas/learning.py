from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EnrollRequest(BaseModel):
    skill_level: Optional[str] = Field(default=None, min_length=3, max_length=20)
    quiz_score: Optional[float] = None


class QuizAttemptRequest(BaseModel):
    answers: Dict[str, Any] = Field(default_factory=dict)


class QuizSubmitRequest(BaseModel):
    quiz_id: str = Field(min_length=1)
    answers: Dict[str, Any] = Field(default_factory=dict)


class ExamSubmitRequest(BaseModel):
    exam_id: str = Field(min_length=1)
    answers: Dict[str, Any] = Field(default_factory=dict)


class LibrarySaveRequest(BaseModel):
    item_type: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    ref_id: Optional[str] = Field(default=None, max_length=200)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    bookmarked: Optional[bool] = False


class PdfAskRequest(BaseModel):
    document_id: str = Field(min_length=32, max_length=36)
    question: str = Field(min_length=3, max_length=2000)


class QuizQuestion(BaseModel):
    id: str
    prompt: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None

