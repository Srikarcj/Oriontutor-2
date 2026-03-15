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
  if (!lessonId) return res.status(400).json({ error: "lesson_id required" });

  const db = getDb();
  const { data: existing } = await db.from("lesson_notes").select("*").eq("lesson_id", lessonId).maybeSingle();
  if (existing?.notes) return res.status(200).json({ notes: existing.notes, pdf_url: existing.pdf_url || null });

  const { data: lesson } = await db
    .from("course_lessons")
    .select("id, title, summary, content, keywords")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const pkg = await generateLessonPackage({
    title: lesson.title,
    summary: lesson.summary || undefined,
    content: lesson.content || undefined,
    keywords: Array.isArray(lesson.keywords) ? (lesson.keywords as string[]) : undefined,
  });

  await db.from("lesson_notes").upsert(
    {
      lesson_id: lessonId,
      notes: pkg.notes,
      summary: pkg.notes.summary || pkg.notes.overview,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lesson_id" }
  );

  await db.from("user_library_items").insert({
    user_id: userId,
    item_type: "lesson_notes",
    title: lesson.title,
    ref_id: lessonId,
    metadata: { summary: pkg.notes.summary || pkg.notes.overview },
  });

  const { data: existingQuiz } = await db.from("lesson_quizzes").select("id").eq("lesson_id", lessonId).limit(1);
  if (!existingQuiz || existingQuiz.length === 0) {
    const inserts = (pkg.quiz || []).map((q) => ({
      lesson_id: lessonId,
      question_type: q.question_type || "multiple",
      prompt: q.prompt,
      options: q.options || null,
      answer: q.answer,
      explanation: q.explanation || null,
      difficulty: q.difficulty || "medium",
    }));
    if (inserts.length) {
      await db.from("lesson_quizzes").insert(inserts);
    }
  }

  return res.status(200).json({ notes: pkg.notes, pdf_url: null });
}
