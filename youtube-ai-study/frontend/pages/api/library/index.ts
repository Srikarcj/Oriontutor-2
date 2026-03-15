import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { listUserLibrary } from "../../../lib/server/data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ detail: "Method not allowed" });
    }

    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ detail: "Unauthorized" });
    }

    const rows = await listUserLibrary(userId);
    const payload = rows.map((row: any) => {
      const video = row.videos;
      const content = Array.isArray(video?.video_content) ? video.video_content[0] : video?.video_content;
      return {
        id: video?.id,
        youtube_url: video?.youtube_url,
        title: video?.title,
        thumbnail: video?.thumbnail,
        created_at: video?.created_at,
        saved_at: row.saved_at,
        content: content
          ? {
              summary: content.summary || "",
              notes: content.notes || null,
              chapters: Array.isArray(content.chapters) ? content.chapters : [],
              quiz: Array.isArray(content.quiz) ? content.quiz : [],
              pdf_url: content.pdf_url || null,
              topics: video?.notes_row?.topics || [],
              mindmap: video?.mindmap_row?.mindmap_json || null,
              flashcards: video?.flashcards_rows || [],
              visual_insights: video?.visual_insights_rows || [],
            }
          : null,
      };
    });

    return res.status(200).json({ items: payload });
  } catch (error: any) {
    const message = error?.message || "Failed to load library.";
    if (message.toLowerCase().includes("relation") || message.toLowerCase().includes("does not exist")) {
      return res.status(200).json({
        items: [],
        warning:
          "Database schema is missing. Run `npm run db:bootstrap` with SUPABASE_DB_URL set in .env.local.",
      });
    }
    return res.status(500).json({ detail: message });
  }
}
