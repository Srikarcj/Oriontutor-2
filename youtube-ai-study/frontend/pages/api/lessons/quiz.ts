import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";
import { generateLessonPackage } from "../../../lib/server/lesson-ai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const lessonId = typeof req.query.lesson_id === "string" ? req.query.lesson_id : "";
  const courseSlug = typeof req.query.course_slug === "string" ? req.query.course_slug : "";
  const day = typeof req.query.day === "string" ? Number(req.query.day) : null;

  const db = getDb();
  let resolvedLessonId = lessonId;

  if (!resolvedLessonId && courseSlug && day) {
    const { data: course } = await db.from("courses").select("id").eq("slug", courseSlug).maybeSingle();
    if (!course) return res.status(404).json({ error: "Course not found" });
    const { data: lesson } = await db
      .from("course_lessons")
      .select("id, title, summary, content, keywords")
      .eq("course_id", course.id)
      .eq("day_number", day)
      .maybeSingle();
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    resolvedLessonId = lesson.id;

    const { data: existing } = await db.from("lesson_quizzes").select("*").eq("lesson_id", lesson.id);
    if (existing && existing.length) return res.status(200).json({ items: existing });

    const pkg = await generateLessonPackage({
      title: lesson.title,
      summary: lesson.summary || undefined,
      content: lesson.content || undefined,
      keywords: Array.isArray(lesson.keywords) ? (lesson.keywords as string[]) : undefined,
    });

    const inserts = (pkg.quiz || []).map((q) => ({
      lesson_id: lesson.id,
      question_type: q.question_type || "multiple",
      prompt: q.prompt,
      options: q.options || null,
      answer: q.answer,
      explanation: q.explanation || null,
      difficulty: q.difficulty || "medium",
    }));
    if (inserts.length) await db.from("lesson_quizzes").insert(inserts);
    const { data: saved } = await db.from("lesson_quizzes").select("*").eq("lesson_id", lesson.id);
    return res.status(200).json({ items: saved || inserts });
  }

  if (!resolvedLessonId) return res.status(400).json({ error: "lesson_id or course_slug+day required" });

  const { data: items } = await db.from("lesson_quizzes").select("*").eq("lesson_id", resolvedLessonId);
  return res.status(200).json({ items: items || [] });
}
