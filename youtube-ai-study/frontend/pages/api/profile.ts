import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/server/db";
import { upsertUser } from "../../lib/server/data";

function computeStreak(dates: string[]) {
  const unique = Array.from(new Set(dates.map((d) => d.slice(0, 10)))).sort().reverse();
  let streak = 0;
  let current = new Date();
  for (const day of unique) {
    const target = new Date(day);
    const diff = Math.floor((current.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));
    if (diff === 0 || diff === 1) {
      streak += 1;
      current = target;
    } else if (diff > 1) {
      break;
    }
  }
  return streak;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const email = String((getAuth(req).sessionClaims?.email as string) || `${userId}@unknown.local`);
  await upsertUser({ clerk_user_id: userId, email });

  const db = getDb();
  const [{ data: enrollments }, { data: progress }, { data: attempts }, { data: badges }, { data: activity }] =
    await Promise.all([
      db.from("course_enrollments").select("course_id").eq("user_id", userId),
      db.from("course_progress").select("course_slug, passed_days, scores").eq("user_id", userId),
      db.from("lesson_quiz_attempts").select("score, passed").eq("user_id", userId),
      db.from("badges").select("badge_name, description, awarded_at").eq("user_id", userId),
      db.from("course_activity").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
    ]);

  const quizzesPassed = (attempts || []).filter((a: any) => a.passed).length;
  const avgScore =
    attempts && attempts.length
      ? attempts.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / attempts.length
      : 0;
  const streak = computeStreak((activity || []).map((a: any) => a.created_at));

  const { data: courses } = await db.from("courses").select("id, slug");
  const totalBySlug = new Map<string, number>();
  for (const c of courses || []) {
    const { count } = await db
      .from("course_lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", c.id);
    totalBySlug.set(c.slug, count || 0);
  }

  let coursesCompleted = 0;
  (progress || []).forEach((row: any) => {
    const passed = Array.isArray(row.passed_days) ? row.passed_days.length : 0;
    const total = totalBySlug.get(row.course_slug) || 0;
    if (total && passed >= total) coursesCompleted += 1;
  });

  return res.status(200).json({
    courses_enrolled: enrollments?.length || 0,
    courses_completed: coursesCompleted,
    quizzes_passed: quizzesPassed,
    avg_score: avgScore,
    streak,
    progress: progress || [],
    badges: badges || [],
  });
}
