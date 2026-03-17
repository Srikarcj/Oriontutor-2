from __future__ import annotations

import random
from typing import Any, Dict, List, Optional, Tuple

import re
import uuid

from backend.app.modules.learning.services.supabase import SupabaseClient

LEVEL_BEGINNER = "beginner"
LEVEL_INTERMEDIATE = "intermediate"
LEVEL_ADVANCED = "advanced"

_UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


def is_uuid(value: Optional[str]) -> bool:
    if not value:
        return False
    if not _UUID_RE.match(str(value)):
        return False
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False

def level_from_score(score_pct: float) -> str:
    if score_pct < 30:
        return LEVEL_BEGINNER
    if score_pct <= 70:
        return LEVEL_INTERMEDIATE
    return LEVEL_ADVANCED


async def list_courses() -> List[Dict[str, Any]]:
    sb = SupabaseClient()
    return await sb.get(
        "courses",
        {"select": "id,slug,title,category,description,difficulty,created_at"},
    )


async def get_course(course_id: Optional[str], course_slug: Optional[str]) -> Optional[Dict[str, Any]]:
    sb = SupabaseClient()
    params: Dict[str, Any] = {"select": "*"}
    if course_id:
        if is_uuid(course_id):
            params["id"] = f"eq.{course_id}"
        else:
            params["slug"] = f"eq.{course_id}"
    elif course_slug:
        params["slug"] = f"eq.{course_slug}"
    else:
        return None
    rows = await sb.get("courses", params)
    return rows[0] if rows else None


async def list_modules(course_id: str) -> List[Dict[str, Any]]:
    sb = SupabaseClient()
    rows = await sb.get(
        "modules",
        {
            "select": "id,course_id,module_number,title,concept,explanation,level_type,estimated_time,learning_objectives",
            "course_id": f"eq.{course_id}",
        },
    )
    level_rank = {LEVEL_BEGINNER: 0, LEVEL_INTERMEDIATE: 1, LEVEL_ADVANCED: 2}
    rows.sort(key=lambda item: (level_rank.get(str(item.get("level_type", "")).lower(), 3), item.get("module_number", 0)))
    return rows


async def get_module(module_id: str) -> Optional[Dict[str, Any]]:
    sb = SupabaseClient()
    rows = await sb.get(
        "modules",
        {
            "select": "id,course_id,module_number,title,concept,explanation,level_type,introduction,examples,practice_questions,practice_answers,summary,advanced_content,learning_objectives,estimated_time",
            "id": f"eq.{module_id}",
        },
    )
    return rows[0] if rows else None


async def list_module_progress(course_id: str, user_id: str) -> List[Dict[str, Any]]:
    sb = SupabaseClient()
    return await sb.get(
        "module_progress",
        {
            "select": "module_id,status,completed_at",
            "course_id": f"eq.{course_id}",
            "user_id": f"eq.{user_id}",
        },
    )


async def list_quiz_questions(course_id: str) -> List[Dict[str, Any]]:
    sb = SupabaseClient()
    rows = await sb.get(
        "quizzes",
        {
            "select": "id,question,options,explanation",
            "course_id": f"eq.{course_id}",
        },
    )
    random.shuffle(rows)
    return rows


async def evaluate_quiz(
    course_id: str,
    answers: Dict[str, Any],
    user_id: str,
) -> Tuple[float, int, int]:
    sb = SupabaseClient()
    rows = await sb.get(
        "quizzes",
        {
            "select": "id,correct_answer",
            "course_id": f"eq.{course_id}",
        },
    )
    if not rows:
        return 0.0, 0, 0
    total = len(rows)
    correct = 0
    for row in rows:
        qid = str(row.get("id"))
        expected = str(row.get("correct_answer", "")).strip().lower()
        provided = str(answers.get(qid, "")).strip().lower()
        if expected and provided and expected == provided:
            correct += 1
    score_pct = (correct / total * 100) if total else 0.0

    # Track quiz attempts (increment attempt_count)
    prev_attempts = await sb.get(
        "quiz_attempts",
        {
            "select": "attempt_count",
            "course_id": f"eq.{course_id}",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    attempt_count = int(prev_attempts[0].get("attempt_count", 0)) + 1 if prev_attempts else 1
    await sb.insert(
        "quiz_attempts",
        {
            "course_id": course_id,
            "user_id": user_id,
            "score": score_pct,
            "attempt_count": attempt_count,
        },
    )

    return score_pct, correct, total


async def get_latest_attempt(course_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    sb = SupabaseClient()
    rows = await sb.get(
        "quiz_attempts",
        {
            "select": "score,attempt_count,created_at",
            "course_id": f"eq.{course_id}",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


async def upsert_enrollment(
    course_id: str,
    user_id: str,
    skill_level: str,
    quiz_score: float,
) -> Dict[str, Any]:
    sb = SupabaseClient()
    payload = {
        "course_id": course_id,
        "user_id": user_id,
        "skill_level": skill_level,
        "quiz_score": quiz_score,
    }
    rows = await sb.upsert(
        "enrollments",
        payload,
        on_conflict="user_id,course_id",
    )
    return rows[0] if rows else payload


def _is_completed(module_id: str, completed: Dict[str, bool]) -> bool:
    return completed.get(module_id, False)


def compute_unlocked_modules(
    modules: List[Dict[str, Any]],
    level: str,
    completed: Optional[Dict[str, bool]] = None,
) -> List[Dict[str, Any]]:
    completed = completed or {}
    allowed: List[str] = []
    level = (level or "").lower()

    if level == LEVEL_BEGINNER:
        allowed = [LEVEL_BEGINNER]
        foundation = next((m for m in modules if str(m.get("level_type", "")).lower() == LEVEL_BEGINNER), None)
        if foundation and _is_completed(str(foundation.get("id")), completed):
            allowed.append(LEVEL_INTERMEDIATE)
    elif level == LEVEL_INTERMEDIATE:
        allowed = [LEVEL_INTERMEDIATE]
    else:
        allowed = [LEVEL_INTERMEDIATE, LEVEL_ADVANCED]

    ordered = [m for m in modules if str(m.get("level_type", "")).lower() in allowed]
    if not ordered:
        return []
    unlocked: List[Dict[str, Any]] = []
    unlocked.append(ordered[0])
    for idx in range(1, len(ordered)):
        prev = ordered[idx - 1]
        if _is_completed(str(prev.get("id")), completed):
            unlocked.append(ordered[idx])
    return unlocked


def compute_next_module(
    modules: List[Dict[str, Any]],
    level: str,
    completed: Optional[Dict[str, bool]] = None,
) -> Optional[Dict[str, Any]]:
    completed = completed or {}
    level = (level or "").lower()
    if level == LEVEL_BEGINNER:
        allowed = {LEVEL_BEGINNER}
        foundation = next((m for m in modules if str(m.get("level_type", "")).lower() == LEVEL_BEGINNER), None)
        if foundation and _is_completed(str(foundation.get("id")), completed):
            allowed.add(LEVEL_INTERMEDIATE)
    elif level == LEVEL_INTERMEDIATE:
        allowed = {LEVEL_INTERMEDIATE}
    else:
        allowed = {LEVEL_INTERMEDIATE, LEVEL_ADVANCED}

    ordered = [m for m in modules if str(m.get("level_type", "")).lower() in allowed]
    if not ordered:
        return None
    for module in ordered:
        if not _is_completed(str(module.get("id")), completed):
            return module
    return ordered[-1] if ordered else None


async def mark_module_complete(course_id: str, module_id: str, user_id: str) -> Dict[str, Any]:
    sb = SupabaseClient()
    payload = {
        "course_id": course_id,
        "module_id": module_id,
        "user_id": user_id,
        "status": "completed",
    }
    rows = await sb.upsert("module_progress", payload, on_conflict="user_id,module_id")
    return rows[0] if rows else payload


async def get_enrollment(course_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    sb = SupabaseClient()
    rows = await sb.get(
        "enrollments",
        {"select": "*", "course_id": f"eq.{course_id}", "user_id": f"eq.{user_id}"},
    )
    return rows[0] if rows else None


async def list_library(user_id: str) -> List[Dict[str, Any]]:
    sb = SupabaseClient()
    return await sb.get(
        "library_items",
        {
            "select": "id,item_type,title,ref_id,metadata,bookmarked,created_at",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
        },
    )


async def save_library_item(user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    sb = SupabaseClient()
    row = {
        "user_id": user_id,
        "item_type": payload.get("item_type"),
        "title": payload.get("title"),
        "ref_id": payload.get("ref_id"),
        "metadata": payload.get("metadata") or {},
        "bookmarked": bool(payload.get("bookmarked", False)),
    }
    rows = await sb.insert("library_items", row)
    return rows[0] if rows else row


async def list_leaderboard(limit: int = 50) -> List[Dict[str, Any]]:
    sb = SupabaseClient()
    # Aggregate quiz_attempts for a lightweight leaderboard.
    attempts = await sb.get(
        "quiz_attempts",
        {"select": "user_id,score", "order": "score.desc"},
    )
    scores: Dict[str, List[float]] = {}
    for row in attempts:
        user_id = row.get("user_id")
        if not user_id:
            continue
        scores.setdefault(user_id, []).append(float(row.get("score", 0)))
    rows = []
    for user_id, values in scores.items():
        avg_score = sum(values) / max(len(values), 1)
        points = int(avg_score * 10)
        rows.append(
            {
                "user_id": user_id,
                "points": points,
                "quiz_score_avg": avg_score,
                "attempts": len(values),
            }
        )
    rows.sort(key=lambda item: item["points"], reverse=True)
    return rows[:limit]


async def get_dashboard(user_id: str) -> Dict[str, Any]:
    sb = SupabaseClient()
    enrollments = await sb.get(
        "enrollments",
        {"select": "course_id,skill_level,quiz_score", "user_id": f"eq.{user_id}"},
    )
    attempts = await sb.get(
        "quiz_attempts",
        {"select": "score", "user_id": f"eq.{user_id}"},
    )
    courses = await list_courses()
    modules = await sb.get("modules", {"select": "id,course_id"})
    progress_rows = await sb.get(
        "module_progress",
        {"select": "course_id,module_id,status", "user_id": f"eq.{user_id}"},
    )

    quiz_avg = 0.0
    if attempts:
        quiz_avg = sum(float(row.get("score", 0)) for row in attempts) / len(attempts)

    profile = {
        LEVEL_BEGINNER: len([e for e in enrollments if e.get("skill_level") == LEVEL_BEGINNER]),
        LEVEL_INTERMEDIATE: len([e for e in enrollments if e.get("skill_level") == LEVEL_INTERMEDIATE]),
        LEVEL_ADVANCED: len([e for e in enrollments if e.get("skill_level") == LEVEL_ADVANCED]),
    }

    recommendations = []
    if courses:
        for course in courses[:3]:
            recommendations.append(
                {
                    "id": course.get("id"),
                    "title": course.get("title"),
                    "difficulty": course.get("difficulty"),
                    "category": course.get("category"),
                }
            )

    module_totals: Dict[str, int] = {}
    for module in modules:
        course_id = str(module.get("course_id"))
        module_totals[course_id] = module_totals.get(course_id, 0) + 1

    module_completed: Dict[str, int] = {}
    for row in progress_rows:
        course_id = str(row.get("course_id"))
        if str(row.get("status")) == "completed":
            module_completed[course_id] = module_completed.get(course_id, 0) + 1

    return {
        "courses_enrolled": len(enrollments),
        "quiz_average": quiz_avg,
        "skill_profile": profile,
        "progress": [
            {
                "course_id": row.get("course_id"),
                "skill_level": row.get("skill_level"),
                "quiz_score": row.get("quiz_score"),
                "progress_pct": int(
                    (module_completed.get(str(row.get("course_id")), 0) / max(module_totals.get(str(row.get("course_id")), 1), 1))
                    * 100
                ),
            }
            for row in enrollments
        ],
        "recommendations": recommendations,
    }
