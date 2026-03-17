import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/server/db";
import { applyRateLimit } from "../../lib/server/rate-limit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: "enrollments" });
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const { data, error } = await db
    .from("course_enrollments")
    .select("id,course_id,level,progress,courses:course_id (id,slug,title)")
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: "Failed to load enrollments" });
  return res.status(200).json({ items: data || [] });
}
