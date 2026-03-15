import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { idSchema } from "../../../lib/validation/schemas";
import { getVideoForUser } from "../../../lib/server/data";
import { getUserPlanUsage } from "../../../lib/server/data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ detail: "Unauthorized" });
  }

  const parsed = idSchema.safeParse({ id: req.query.id });
  if (!parsed.success) {
    return res.status(400).json({ detail: "Invalid video id" });
  }

  const video = await getVideoForUser(userId, parsed.data.id);
  if (!video) {
    return res.status(404).json({ detail: "Video not found" });
  }

  const usage = await getUserPlanUsage(userId);
  const content = Array.isArray(video.video_content) ? video.video_content[0] : video.video_content;
  const notesRow = (video as any).notes_row;
  const mindmapRow = (video as any).mindmap_row;
  const flashcardsRows = (video as any).flashcards_rows || [];
  const visualInsightsRows = (video as any).visual_insights_rows || [];

  return res.status(200).json({
    id: video.id,
    title: video.title,
    thumbnail: video.thumbnail,
    youtube_url: video.youtube_url,
    created_at: video.created_at,
    transcript: notesRow?.transcript || content?.transcript || "",
    summary: notesRow?.summary || content?.summary || "",
    notes: notesRow?.structured_notes || content?.notes || null,
    chapters: Array.isArray(content?.chapters) ? content.chapters : [],
    quiz: Array.isArray(content?.quiz) ? content.quiz : [],
    pdf_url: content?.pdf_url || null,
    mindmap: mindmapRow?.mindmap_json || null,
    flashcards: flashcardsRows,
    visual_insights: visualInsightsRows,
    plan: usage.plan,
  });
}
