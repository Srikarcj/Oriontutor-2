import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../lib/server/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getDb();
  const { data: rows, error } = await db
    .from("leaderboard")
    .select("*")
    .order("points", { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: "Failed to load leaderboard" });

  const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id)));
  const { data: users } = await db
    .from("users")
    .select("clerk_user_id, username, full_name, avatar_url")
    .in("clerk_user_id", userIds);
  const userById = new Map<string, any>();
  (users || []).forEach((u: any) => userById.set(u.clerk_user_id, u));

  const items = (rows || []).map((row: any, idx: number) => ({
    rank: idx + 1,
    user_id: row.user_id,
    points: row.points || 0,
    quiz_score_avg: row.quiz_score_avg || 0,
    courses_completed: row.courses_completed || 0,
    learning_streak: row.learning_streak || 0,
    progress: row.progress || 0,
    user: userById.get(row.user_id) || null,
  }));

  return res.status(200).json({ items });
}
