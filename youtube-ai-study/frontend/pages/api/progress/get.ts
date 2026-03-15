import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const { data, error } = await db
    .from("course_progress")
    .select("course_slug, passed_days, scores, updated_at")
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: "Failed to load progress" });
  return res.status(200).json({ items: data || [] });
}
