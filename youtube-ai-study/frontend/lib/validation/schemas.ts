import { z } from "zod";

const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;

export const processVideoSchema = z.object({
  youtube_url: z.string().trim().url().refine((value) => youtubeRegex.test(value), {
    message: "Please provide a valid YouTube URL.",
  }),
});

export const askQuestionSchema = z.object({
  video_id: z.string().trim().min(1),
  question: z.string().trim().min(3).max(2000),
  pdf_document_ids: z.array(z.string().uuid()).optional(),
});

export const idSchema = z.object({
  id: z.string().trim().min(1),
});

export const pdfAskSchema = z.object({
  id: z.string().trim().uuid(),
  question: z.string().trim().min(3).max(2000),
});

export const enrollSchema = z
  .object({
    course_id: z.string().uuid().optional(),
    course_slug: z.string().min(1).optional(),
  })
  .refine((val) => Boolean(val.course_id || val.course_slug), {
    message: "course_id or course_slug required",
  });

export const adaptiveEnrollSchema = z.object({
  skill_level: z.string().min(3).max(20).optional(),
  quiz_score: z.number().min(0).max(100).optional(),
});

export const quizAttemptSchema = z.object({
  answers: z.record(z.any()).optional(),
});

export const courseContentSchema = z
  .object({
    course_id: z.string().uuid().optional(),
    course_slug: z.string().min(1).optional(),
  })
  .refine((val) => Boolean(val.course_id || val.course_slug), {
    message: "course_id or course_slug required",
  });

export const quizSubmitSchema = z.object({
  quiz_id: z.string().min(1),
  answers: z.record(z.any()).default({}),
});

export const examSubmitSchema = z.object({
  exam_id: z.string().min(1),
  answers: z.record(z.any()).default({}),
});

export const librarySaveSchema = z.object({
  item_type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  ref_id: z.string().max(200).optional(),
  metadata: z.record(z.any()).optional(),
  bookmarked: z.boolean().optional(),
});

export function getYouTubeThumbnail(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }

    const id = parsed.searchParams.get("v");
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  } catch {
    return "";
  }

  return "";
}
