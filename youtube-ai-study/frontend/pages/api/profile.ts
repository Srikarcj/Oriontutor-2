import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/server/db";
import { upsertUser } from "../../lib/server/data";
import { applyRateLimit } from "../../lib/server/rate-limit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: "profile" });
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const email = String((getAuth(req).sessionClaims?.email as string) || `${userId}@unknown.local`);
  await upsertUser({ clerk_user_id: userId, email });

  const db = getDb();
  const [{ data: enrollments }, { data: quizResults }, { data: examResults }, { data: leaderboard }] = await Promise.all([
    db
      .from("course_enrollments")
      .select("id,course_id,level,progress,courses:course_id (id,slug,title)")
      .eq("user_id", userId),
    db.from("quiz_results").select("score,total").eq("user_id", userId),
    db.from("exam_results").select("score,total").eq("user_id", userId),
    db.from("leaderboard").select("points,quiz_score_avg,exam_score_avg").eq("user_id", userId).maybeSingle(),
  ]);

  const quizAvg = quizResults && quizResults.length
    ? quizResults.reduce((sum: number, row: any) => sum + (Number(row.score || 0) / Math.max(Number(row.total || 1), 1)) * 100, 0) / quizResults.length
    : 0;
  const examAvg = examResults && examResults.length
    ? examResults.reduce((sum: number, row: any) => sum + (Number(row.score || 0) / Math.max(Number(row.total || 1), 1)) * 100, 0) / examResults.length
    : 0;

  return res.status(200).json({
    courses_enrolled: enrollments?.length || 0,
    quizzes_passed: quizResults?.length || 0,
    avg_score: quizAvg,
    exam_avg: examAvg,
    streak: 0,
    progress: enrollments || [],
    badges: [],
    leaderboard: leaderboard || null,
  });
}
