from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException

from backend.app.modules.learning.schemas.learning import (
    EnrollRequest,
    QuizAttemptRequest,
    LibrarySaveRequest,
)
from backend.app.modules.learning.services.learning_service import (
    compute_unlocked_modules,
    compute_next_module,
    evaluate_quiz,
    get_course,
    get_enrollment,
    get_module,
    get_latest_attempt,
    is_uuid,
    list_module_progress,
    level_from_score,
    list_courses,
    list_modules,
    list_quiz_questions,
    mark_module_complete,
    upsert_enrollment,
)
from backend.app.modules.learning.services.learning_service import (
    list_library,
    save_library_item,
    list_leaderboard,
    get_dashboard,
)
from backend.app.modules.learning.services.supabase import SupabaseError

router = APIRouter()


def _require_user(user_id: str) -> str:
    if not user_id or len(user_id) > 128:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user_id


@router.get("/courses")
async def courses_list() -> Dict[str, Any]:
    try:
        items = await list_courses()
        return {"items": items}
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load courses: {exc}")


@router.get("/courses/{course_id}/modules")
async def course_modules(
    course_id: str,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    course = await get_course(course_id, None) if is_uuid(course_id) else await get_course(None, course_id)
    if not course:
        # try slug fallback
        course = await get_course(None, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        modules = await list_modules(course["id"])
        enrollment = await get_enrollment(course["id"], user_id)
        skill_level = enrollment.get("skill_level") if enrollment else None
        progress_rows = await list_module_progress(course["id"], user_id)
        completed = {str(row.get("module_id")): str(row.get("status")) == "completed" for row in progress_rows}

        unlocked = compute_unlocked_modules(modules, skill_level or "", completed)
        unlocked_ids = {m["id"] for m in unlocked}

        response_modules = []
        for module in modules:
            locked = module["id"] not in unlocked_ids
            response_modules.append(
                {
                    "id": module["id"],
                    "module_number": module.get("module_number"),
                    "title": module.get("title"),
                    "concept": module.get("concept"),
                    "level_type": module.get("level_type"),
                    "locked": locked or not enrollment,
                    "completed": completed.get(str(module.get("id")), False),
                    "explanation": None if locked or not enrollment else module.get("explanation"),
                }
            )

        return {
            "course": course,
            "modules": response_modules,
            "enrollment": enrollment,
            "skill_level": skill_level,
            "unlocked_modules": [m for m in response_modules if not m["locked"]],
        }
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load modules: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error loading modules: {exc}")


@router.post("/courses/{course_id}/quiz-attempt")
async def quiz_attempt(
    course_id: str,
    payload: QuizAttemptRequest,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    course = (await get_course(course_id, None)) if is_uuid(course_id) else (await get_course(None, course_id))
    if not course:
        course = await get_course(None, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        if not payload.answers:
            questions = await list_quiz_questions(course["id"])
            return {"questions": questions}

        score_pct, correct, total = await evaluate_quiz(course["id"], payload.answers, user_id)
        skill_level = level_from_score(score_pct)
        return {
            "score": score_pct,
            "correct": correct,
            "total": total,
            "skill_level": skill_level,
        }
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Quiz attempt failed: {exc}")


@router.post("/courses/{course_id}/enroll")
async def enroll_course(
    course_id: str,
    payload: EnrollRequest,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    course = (await get_course(course_id, None)) if is_uuid(course_id) else (await get_course(None, course_id))
    if not course:
        course = await get_course(None, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    quiz_score = payload.quiz_score
    skill_level = payload.skill_level
    if quiz_score is None or not skill_level:
        latest_attempt = await get_latest_attempt(course["id"], user_id)
        if not latest_attempt:
            raise HTTPException(status_code=400, detail="Quiz attempt required before enrollment")
        quiz_score = float(latest_attempt.get("score", 0))
        skill_level = level_from_score(quiz_score)

    try:
        enrollment = await upsert_enrollment(course["id"], user_id, skill_level, quiz_score)
        modules = await list_modules(course["id"])
        progress_rows = await list_module_progress(course["id"], user_id)
        completed = {str(row.get("module_id")): str(row.get("status")) == "completed" for row in progress_rows}
        unlocked = compute_unlocked_modules(modules, skill_level, completed)
        return {
            "skill_level": skill_level,
            "quiz_score": quiz_score,
            "unlocked_modules": [m["id"] for m in unlocked],
            "enrollment": enrollment,
        }
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {exc}")


@router.get("/courses/{course_id}/modules/{module_id}")
async def module_detail(
    course_id: str,
    module_id: str,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    course = (await get_course(course_id, None)) if is_uuid(course_id) else (await get_course(None, course_id))
    if not course:
        course = await get_course(None, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        modules = await list_modules(course["id"])
        enrollment = await get_enrollment(course["id"], user_id)
        skill_level = enrollment.get("skill_level") if enrollment else None
        progress_rows = await list_module_progress(course["id"], user_id)
        completed = {str(row.get("module_id")): str(row.get("status")) == "completed" for row in progress_rows}
        unlocked = compute_unlocked_modules(modules, skill_level or "", completed)
        unlocked_ids = {m["id"] for m in unlocked}
        prev_module_id = None
        next_module_id = None

        module = await get_module(module_id)
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        if str(module.get("course_id")) != str(course.get("id")):
            raise HTTPException(status_code=404, detail="Module not found in course")

        locked = module["id"] not in unlocked_ids or not enrollment
        is_advanced = (skill_level or "").lower() == "advanced"

        if unlocked:
            for idx, item in enumerate(unlocked):
                if str(item.get("id")) == str(module.get("id")):
                    if idx > 0:
                        prev_module_id = unlocked[idx - 1].get("id")
                    if idx + 1 < len(unlocked):
                        next_module_id = unlocked[idx + 1].get("id")
                    break

        completed_count = len([v for v in completed.values() if v])
        progress_pct = int((completed_count / max(len(modules), 1)) * 100)

        return {
            "course": course,
            "module_header": {
                "title": module.get("title"),
                "concept": module.get("concept"),
                "difficulty": module.get("level_type"),
                "estimated_time": module.get("estimated_time"),
                "learning_objectives": module.get("learning_objectives"),
            },
            "module": {
                "id": module.get("id"),
                "module_number": module.get("module_number"),
                "title": module.get("title"),
                "concept": module.get("concept"),
                "level_type": module.get("level_type"),
                "estimated_time": module.get("estimated_time"),
                "learning_objectives": module.get("learning_objectives"),
                "introduction": None if locked else module.get("introduction"),
                "explanation": None if locked else module.get("explanation"),
                "examples": None if locked else module.get("examples"),
                "practice_questions": None if locked else module.get("practice_questions"),
                "practice_answers": None if locked else module.get("practice_answers"),
                "summary": None if locked else module.get("summary"),
                "advanced_content": module.get("advanced_content") if (not locked and is_advanced) else None,
                "locked": locked,
                "completed": completed.get(str(module.get("id")), False),
                "prev_module_id": prev_module_id,
                "next_module_id": next_module_id,
                "progress_pct": progress_pct,
            },
            "skill_level": skill_level,
        }
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load module: {exc}")


@router.post("/courses/{course_id}/modules/{module_id}/complete")
async def complete_module(
    course_id: str,
    module_id: str,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    course = (await get_course(course_id, None)) if is_uuid(course_id) else (await get_course(None, course_id))
    if not course:
        course = await get_course(None, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        await mark_module_complete(course["id"], module_id, user_id)
        modules = await list_modules(course["id"])
        enrollment = await get_enrollment(course["id"], user_id)
        skill_level = enrollment.get("skill_level") if enrollment else None
        progress_rows = await list_module_progress(course["id"], user_id)
        completed = {str(row.get("module_id")): str(row.get("status")) == "completed" for row in progress_rows}
        unlocked = compute_unlocked_modules(modules, skill_level or "", completed)
        next_module = compute_next_module(modules, skill_level or "", completed)
        completed_count = len([v for v in completed.values() if v])
        progress_pct = int((completed_count / max(len(modules), 1)) * 100)

        return {
            "status": "completed",
            "module_id": module_id,
            "next_module_id": next_module.get("id") if next_module else None,
            "progress_pct": progress_pct,
            "unlocked_modules": [m["id"] for m in unlocked],
        }
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to mark module complete: {exc}")


@router.get("/leaderboard")
async def leaderboard() -> Dict[str, Any]:
    try:
        items = await list_leaderboard()
        return {"items": items}
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load leaderboard: {exc}")


@router.get("/dashboard")
async def dashboard(x_user_id: str = Header(default="", alias="X-User-Id")) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    try:
        return await get_dashboard(user_id)
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {exc}")


@router.post("/library/save")
async def library_save(
    payload: LibrarySaveRequest,
    x_user_id: str = Header(default="", alias="X-User-Id"),
) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    try:
        item = await save_library_item(user_id, payload.model_dump())
        return {"item": item}
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save item: {exc}")


@router.get("/library")
async def library_list(x_user_id: str = Header(default="", alias="X-User-Id")) -> Dict[str, Any]:
    user_id = _require_user(x_user_id)
    try:
        items = await list_library(user_id)
        return {"items": items}
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load library: {exc}")
