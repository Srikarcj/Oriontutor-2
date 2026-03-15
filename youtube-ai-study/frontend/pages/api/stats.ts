import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../lib/server/db";

type StatsResponse = {
  videosAnalyzed: number;
  notesGenerated: number;
  flashcardsCreated: number;
  mindmapsGenerated: number;
  updatedAt: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<StatsResponse | { error: string }>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getDb() as any;

  try {
    const [videos, notes, flashcards, mindmaps] = await Promise.all([
      db.from("videos").select("id", { count: "exact", head: true }),
      db.from("notes").select("id", { count: "exact", head: true }),
      db.from("flashcards").select("id", { count: "exact", head: true }).eq("position", 0),
      db.from("mindmap").select("id", { count: "exact", head: true }),
    ]);

    const payload: StatsResponse = {
      videosAnalyzed: videos?.count ?? 0,
      notesGenerated: notes?.count ?? 0,
      flashcardsCreated: flashcards?.count ?? 0,
      mindmapsGenerated: mindmaps?.count ?? 0,
      updatedAt: new Date().toISOString(),
    };

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ error: "Failed to load stats" });
  }
}
