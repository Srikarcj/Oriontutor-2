import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";
import { courses as localCourses } from "../../../lib/course-data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getDb();
  const { userId } = getAuth(req);

  const { data: courses, error } = await db.from("courses").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load courses", error);
    const items = localCourses.map((course: any) => ({
      ...course,
      enrollments_count: 0,
      is_enrolled: false,
      lessons_count: course.lessons_count || 0,
      modules_count: (course.lessons_count || 0) * 4,
    }));
    return res.status(200).json({ items, fallback: true });
  }

  const { data: enrollments } = await db.from("course_enrollments").select("course_id, user_id");
  const { data: lessons } = await db.from("course_lessons").select("course_id");

  const lessonCounts = new Map<string, number>();
  (lessons || []).forEach((row: any) => {
    lessonCounts.set(row.course_id, (lessonCounts.get(row.course_id) || 0) + 1);
  });
  const counts = new Map<string, number>();
  (enrollments || []).forEach((row: any) => {
    counts.set(row.course_id, (counts.get(row.course_id) || 0) + 1);
  });

  const enrolledSet = new Set<string>();
  if (userId) {
    (enrollments || [])
      .filter((row: any) => row.user_id === userId)
      .forEach((row: any) => enrolledSet.add(row.course_id));
  }

  const items = (courses || []).map((course: any) => ({
    ...course,
    enrollments_count: counts.get(course.id) || 0,
    is_enrolled: enrolledSet.has(course.id),
    lessons_count: lessonCounts.get(course.id) || 0,
    modules_count: (lessonCounts.get(course.id) || 0) * 4,
  }));

  return res.status(200).json({ items });
}
