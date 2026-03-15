import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  if (!slug) return res.status(400).json({ error: "Invalid slug" });

  const db = getDb();
  const { userId } = getAuth(req);

  const { data: course, error } = await db.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (error) return res.status(500).json({ error: "Failed to load course" });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const [{ data: stages }, { data: lessons }, { data: materials }, { data: enrollments }] = await Promise.all([
    db.from("course_stages").select("*").eq("course_id", course.id).order("position", { ascending: true }),
    db.from("course_lessons").select("*").eq("course_id", course.id).order("day_number", { ascending: true }),
    db.from("course_materials").select("*").eq("course_id", course.id),
    db.from("course_enrollments").select("*").eq("course_id", course.id),
  ]);

  const enrollmentCount = enrollments?.length || 0;
  const enrollment = userId ? enrollments?.find((row: any) => row.user_id === userId) : null;

  return res.status(200).json({
    ...course,
    stages: stages || [],
    lessons: lessons || [],
    materials: materials || [],
    enrollments_count: enrollmentCount,
    enrollment: enrollment || null,
  });
}
