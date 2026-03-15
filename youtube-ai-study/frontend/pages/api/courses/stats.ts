import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../lib/server/db";
import { courses as localCourses } from "../../../lib/course-data";

type CoursesStats = {
  students: number;
  courses: number;
  completed: number;
  updatedAt: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<CoursesStats | { error: string }>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getDb();

  try {
    const [courses, enrollments] = await Promise.all([
      db.from("courses").select("id", { count: "exact", head: true }),
      db.from("course_enrollments").select("id", { count: "exact", head: true }),
    ]);

    const { data: leaderboardRows } = await db.from("leaderboard").select("courses_completed");
    const completed = (leaderboardRows || []).reduce(
      (sum: number, row: any) => sum + Number(row.courses_completed || 0),
      0
    );

    const payload: CoursesStats = {
      students: enrollments?.count ?? 0,
      courses: courses?.count ?? 0,
      completed,
      updatedAt: new Date().toISOString(),
    };

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(200).json({
      students: 0,
      courses: localCourses.length,
      completed: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}
