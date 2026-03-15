import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../../lib/server/db";
import { getSupabaseAdmin } from "../../../../lib/server/supabase-admin";
import { generateLessonPackage } from "../../../../lib/server/lesson-ai";

function buildPdf(title: string, sections: Array<{ label: string; items: string[] }>) {
  const lines = [
    title,
    "",
    ...sections.flatMap((section) => [
      section.label,
      ...section.items.map((item, idx) => `  ${idx + 1}. ${item}`),
      "",
    ]),
  ];
  const text = lines.join("\n").trim();
  const content = text.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const header = "%PDF-1.4\n";
  const body =
    `1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n` +
    `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n` +
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n` +
    `4 0 obj<< /Length ${content.length + 73} >>stream\nBT /F1 12 Tf 50 740 Td (${content}) Tj ET\nendstream\nendobj\n` +
    `5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`;
  const xrefPosition = header.length + body.length;
  const xref =
    `xref\n0 6\n0000000000 65535 f \n` +
    `0000000009 00000 n \n` +
    `0000000058 00000 n \n` +
    `0000000111 00000 n \n` +
    `0000000242 00000 n \n` +
    `0000000380 00000 n \n`;
  const trailer = `trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
  return header + body + xref + trailer;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const lessonId = typeof req.body?.lesson_id === "string" ? req.body.lesson_id : "";
  const title = typeof req.body?.title === "string" ? req.body.title : "OrionTutor Notes";
  if (!lessonId) return res.status(400).json({ error: "lesson_id required" });

  const db = getDb();
  const { data: existing } = await db.from("lesson_notes").select("notes").eq("lesson_id", lessonId).maybeSingle();
  let notes = existing?.notes;

  if (!notes) {
    const { data: lesson } = await db
      .from("course_lessons")
      .select("title, summary, content, keywords")
      .eq("id", lessonId)
      .maybeSingle();
    if (lesson) {
      const pkg = await generateLessonPackage({
        title: lesson.title,
        summary: lesson.summary || undefined,
        content: lesson.content || undefined,
        keywords: Array.isArray(lesson.keywords) ? (lesson.keywords as string[]) : undefined,
      });
      notes = pkg.notes;
      await db.from("lesson_notes").upsert(
        {
          lesson_id: lessonId,
          notes: pkg.notes,
          summary: pkg.notes.summary || pkg.notes.overview,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lesson_id" }
      );
    }
  }

  const sections = [
    { label: "Overview", items: [notes?.overview || notes?.summary || ""] },
    { label: "Breakdown", items: Array.isArray(notes?.breakdown) ? notes.breakdown : [] },
    { label: "Steps", items: Array.isArray(notes?.steps) ? notes.steps : [] },
    { label: "Key Points", items: Array.isArray(notes?.key_points) ? notes.key_points : [] },
    { label: "Examples", items: Array.isArray(notes?.examples) ? notes.examples : [] },
  ].filter((section) => section.items.filter(Boolean).length);

  const pdf = buildPdf(title, sections);
  const buffer = Buffer.from(pdf, "utf-8");

  const storage = getSupabaseAdmin().storage.from("lesson-notes");
  const path = `lessons/${lessonId}.pdf`;
  await storage.upload(path, buffer, { upsert: true, contentType: "application/pdf" });
  await db
    .from("lesson_notes")
    .upsert({ lesson_id: lessonId, pdf_url: path, updated_at: new Date().toISOString() }, { onConflict: "lesson_id" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=notes.pdf");
  res.status(200).send(buffer);
}
