import type { NextApiRequest, NextApiResponse } from "next";
import { clerkClient, getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/server/db";
import { readOptional } from "../../../lib/server/env";

function isAdmin(email?: string | null) {
  const allow = readOptional("ADMIN_EMAILS");
  if (!allow) return true;
  const list = allow.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!email) return false;
  return list.includes(email.toLowerCase());
}

async function getAuthEmail(req: NextApiRequest) {
  const { userId, sessionClaims } = getAuth(req);
  if (!userId) return { userId: null, email: null };
  let email =
    (sessionClaims?.email as string) ||
    (sessionClaims?.email_address as string) ||
    null;
  if (!email) {
    const user = await clerkClient.users.getUser(userId);
    email =
      user.emailAddresses.find((addr) => addr.id === user.primaryEmailAddressId)?.emailAddress ||
      user.emailAddresses[0]?.emailAddress ||
      null;
  }
  return { userId, email };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, email } = await getAuthEmail(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!isAdmin(email)) return res.status(403).json({ error: "Forbidden" });

  const db = getDb();

  if (req.method === "GET") {
    const { lesson_id } = req.query;
    let query = db.from("lesson_quizzes").select("*");
    if (typeof lesson_id === "string") query = query.eq("lesson_id", lesson_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: "Failed to load quizzes" });
    return res.status(200).json({ items: data || [] });
  }

  if (req.method === "POST") {
    const payload = req.body || {};
    if (!payload.lesson_id || !payload.prompt || !payload.answer) {
      return res.status(400).json({ error: "lesson_id, prompt, answer required" });
    }
    const { data, error } = await db.from("lesson_quizzes").insert(payload).select("*").single();
    if (error) return res.status(500).json({ error: "Failed to create quiz" });
    return res.status(200).json({ quiz: data });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const { data, error } = await db.from("lesson_quizzes").update(updates).eq("id", id).select("*").single();
    if (error) return res.status(500).json({ error: "Failed to update quiz" });
    return res.status(200).json({ quiz: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await db.from("lesson_quizzes").delete().eq("id", id);
    if (error) return res.status(500).json({ error: "Failed to delete quiz" });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
