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
    const { data, error } = await db.from("courses").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: "Failed to load courses" });
    return res.status(200).json({ items: data || [] });
  }

  if (req.method === "PUT") {
    const { course_id, title, position } = req.body || {};
    if (!course_id || !title) return res.status(400).json({ error: "course_id and title required" });
    const { data, error } = await db
      .from("course_stages")
      .insert({ course_id, title, position: Number(position || 0) })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: "Failed to create stage" });
    return res.status(200).json({ stage: data });
  }

  if (req.method === "PATCH") {
    const { stage_id, title, position } = req.body || {};
    if (!stage_id) return res.status(400).json({ error: "stage_id required" });
    const { data, error } = await db
      .from("course_stages")
      .update({ title, position })
      .eq("id", stage_id)
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: "Failed to update stage" });
    return res.status(200).json({ stage: data });
  }

  if (req.method === "POST") {
    const payload = req.body || {};
    if (!payload.slug || !payload.title) return res.status(400).json({ error: "slug and title required" });
    const { data, error } = await db.from("courses").upsert(payload, { onConflict: "slug" }).select("*").single();
    if (error) return res.status(500).json({ error: "Failed to save course" });
    return res.status(200).json({ course: data });
  }

  if (req.method === "DELETE") {
    const { id, type } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    if (type === "stage") {
      const { error } = await db.from("course_stages").delete().eq("id", id);
      if (error) return res.status(500).json({ error: "Failed to delete stage" });
      return res.status(200).json({ ok: true });
    }
    const { error } = await db.from("courses").delete().eq("id", id);
    if (error) return res.status(500).json({ error: "Failed to delete course" });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
