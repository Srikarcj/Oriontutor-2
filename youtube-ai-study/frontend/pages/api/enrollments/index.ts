import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";
import { upsertUser } from "../../../lib/server/data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const email = String((getAuth(req).sessionClaims?.email as string) || `${userId}@unknown.local`);
  await upsertUser({ clerk_user_id: userId, email });

  if (req.method === "GET") {
    const { data, error } = await db
      .from("course_enrollments")
      .select("*, courses(*)")
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: "Failed to load enrollments" });
    const items = data || [];
    const courseIds = Array.from(new Set(items.map((row: any) => row.course_id)));
    const counts = new Map<string, number>();
    for (const id of courseIds) {
      const { count } = await db
        .from("course_lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", id);
      counts.set(id, count || 0);
    }
    items.forEach((row: any) => {
      if (row.courses) {
        row.courses.lessons_count = counts.get(row.course_id) || 0;
      }
    });
    return res.status(200).json({ items });
  }

  if (req.method === "POST") {
    const { course_id, course_slug } = req.body || {};
    let courseId = course_id;
    if (!courseId && course_slug) {
      const { data: course } = await db.from("courses").select("id").eq("slug", course_slug).maybeSingle();
      courseId = course?.id;
    }
    if (!courseId) return res.status(400).json({ error: "course_id or course_slug required" });

    const payload = {
      user_id: userId,
      course_id: courseId,
      enrolled_at: new Date().toISOString(),
      status: "active",
    };
    const { data, error } = await db
      .from("course_enrollments")
      .upsert(payload, { onConflict: "user_id,course_id" })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: "Failed to enroll" });
    return res.status(200).json({ enrollment: data });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
