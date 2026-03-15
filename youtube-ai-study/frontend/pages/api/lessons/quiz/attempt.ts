import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../../lib/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { course_slug, day, score, total, passed, answers } = req.body || {};
  if (!course_slug || !day) return res.status(400).json({ error: "course_slug and day required" });

  const db = getDb();
  const { data: course } = await db.from("courses").select("id").eq("slug", course_slug).maybeSingle();
  if (!course) return res.status(404).json({ error: "Course not found" });

  const { data: lesson } = await db
    .from("course_lessons")
    .select("id")
    .eq("course_id", course.id)
    .eq("day_number", day)
    .maybeSingle();

  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  await db.from("lesson_quiz_attempts").insert({
    lesson_id: lesson.id,
    user_id: userId,
    score: Number(score || 0),
    total: Number(total || 1),
    passed: Boolean(passed),
    answers: answers || {},
  });

  const { data: attempts } = await db
    .from("lesson_quiz_attempts")
    .select("score")
    .eq("user_id", userId);
  const avgScore =
    attempts && attempts.length
      ? attempts.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / attempts.length
      : 0;

  const { data: progressRows } = await db
    .from("course_progress")
    .select("course_slug, passed_days")
    .eq("user_id", userId);

  const { data: courseRows } = await db.from("courses").select("id, slug");
  const totalLessonsBySlug = new Map<string, number>();
  for (const c of courseRows || []) {
    const { count } = await db
      .from("course_lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", c.id);
    totalLessonsBySlug.set(c.slug, count || 0);
  }

  let coursesCompleted = 0;
  let progressSum = 0;
  let progressCount = 0;
  (progressRows || []).forEach((row: any) => {
    const totalLessons = totalLessonsBySlug.get(row.course_slug) || 0;
    if (!totalLessons) return;
    const passedDays = Array.isArray(row.passed_days) ? row.passed_days.length : 0;
    const pct = Math.min((passedDays / totalLessons) * 100, 100);
    progressSum += pct;
    progressCount += 1;
    if (passedDays >= totalLessons) coursesCompleted += 1;
  });

  const avgProgress = progressCount ? progressSum / progressCount : 0;
  const { data: userRow } = await db
    .from("users")
    .select("learning_streak")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  const streak = userRow?.learning_streak || 0;

  const points = Math.round(avgScore * 2 + coursesCompleted * 100 + avgProgress + streak * 5);

  await db.from("leaderboard").upsert(
    {
      user_id: userId,
      points,
      quiz_score_avg: avgScore,
      courses_completed: coursesCompleted,
      progress: avgProgress,
      learning_streak: streak,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return res.status(200).json({ ok: true });
}
