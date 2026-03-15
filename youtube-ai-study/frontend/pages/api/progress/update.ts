import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { course_slug, day, score, passed } = req.body || {};
  if (!course_slug || !day) return res.status(400).json({ error: "course_slug and day required" });

  const db = getDb();
  const { data, error } = await db
    .from("course_progress")
    .select("id, passed_days, scores")
    .eq("user_id", userId)
    .eq("course_slug", course_slug)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "Failed to load progress" });

  const passedDays: number[] = data?.passed_days || [];
  const scores: Record<string, number> = data?.scores || {};
  scores[day] = Number(score || 0);
  if (passed && !passedDays.includes(day)) passedDays.push(day);

  const payload = {
    user_id: userId,
    course_slug,
    passed_days: passedDays,
    scores,
    updated_at: new Date().toISOString(),
  };

  const upsert = await db.from("course_progress").upsert(payload, { onConflict: "user_id,course_slug" });
  if (upsert.error) return res.status(500).json({ error: "Failed to save progress" });

  const { data: course } = await db.from("courses").select("id").eq("slug", course_slug).maybeSingle();
  if (course?.id) {
    const { count } = await db
      .from("course_lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course.id);
    const totalLessons = count || 0;
    const percent = totalLessons ? Math.min((passedDays.length / totalLessons) * 100, 100) : 0;
    await db
      .from("course_enrollments")
      .update({ progress: percent, last_accessed_at: new Date().toISOString() })
      .eq("course_id", course.id)
      .eq("user_id", userId);
  }

  return res.status(200).json({ ok: true });
}
