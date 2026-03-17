import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { applyRateLimit } from "../../lib/server/rate-limit";
import { readRequired, serverEnv } from "../../lib/server/env";
import { examSubmitSchema } from "../../lib/validation/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: "exams" });
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests" });

  const backendUrl = readRequired("BACKEND_URL");

  if (req.method === "GET") {
    const params = new URLSearchParams();
    if (typeof req.query.course_id === "string") params.set("course_id", req.query.course_id);
    if (typeof req.query.course_slug === "string") params.set("course_slug", req.query.course_slug);
    const query = params.toString() ? `?${params.toString()}` : "";
    const upstream = await fetch(`${backendUrl}/api/exams${query}`, {
      method: "GET",
      headers: {
        ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
      },
    });

    const text = await upstream.text();
    if (!upstream.ok) return res.status(upstream.status).json({ error: text || "Failed to load exams" });
    return res.status(200).json(JSON.parse(text));
  }

  if (req.method === "POST") {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const parsed = examSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid request" });
    }
    const upstream = await fetch(`${backendUrl}/api/exams/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
        ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
      },
      body: JSON.stringify(parsed.data),
    });
    const text = await upstream.text();
    if (!upstream.ok) return res.status(upstream.status).json({ error: text || "Exam submit failed" });
    return res.status(200).json(JSON.parse(text));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
