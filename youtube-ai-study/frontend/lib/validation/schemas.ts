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
});

export const idSchema = z.object({
  id: z.string().trim().min(1),
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
