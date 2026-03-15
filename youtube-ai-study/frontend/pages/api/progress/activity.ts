import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";
import { upsertUser } from "../../../lib/server/data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const email = String((getAuth(req).sessionClaims?.email as string) || `${userId}@unknown.local`);
  await upsertUser({ clerk_user_id: userId, email });
  const { course_slug, day, seconds_spent } = req.body || {};
  if (!course_slug || !day) return res.status(400).json({ error: "course_slug and day required" });

  const db = getDb();
  const payload = {
    user_id: userId,
    course_slug,
    day_number: day,
    seconds_spent: Number(seconds_spent || 0),
  };

  const { error } = await db.from("course_activity").insert(payload);
  if (error) return res.status(500).json({ error: "Failed to store activity" });

  const today = new Date().toISOString().slice(0, 10);
  const { data: userRow } = await db
    .from("users")
    .select("learning_streak, last_active_date")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  let streak = userRow?.learning_streak || 0;
  const last = userRow?.last_active_date ? String(userRow.last_active_date) : null;
  if (!last) {
    streak = 1;
  } else if (last !== today) {
    const lastDate = new Date(last);
    const diff = Math.floor((new Date(today).getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
    streak = diff === 1 ? streak + 1 : 1;
  }

  await db
    .from("users")
    .update({
      learning_streak: streak,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", userId);

  return res.status(200).json({ ok: true });
}
