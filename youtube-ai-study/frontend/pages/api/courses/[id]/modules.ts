import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { applyRateLimit } from "../../../../lib/server/rate-limit";
import { readRequired, serverEnv } from "../../../../lib/server/env";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 120, keyPrefix: "courses-modules" });
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const courseId = typeof req.query.id === "string" ? req.query.id : "";
  if (!courseId) return res.status(400).json({ error: "Course id required" });

  const backendUrl = readRequired("BACKEND_URL");
  const upstream = await fetch(`${backendUrl}/api/courses/${encodeURIComponent(courseId)}/modules`, {
    method: "GET",
    headers: {
      "X-User-Id": userId,
      ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
    },
  });

  const text = await upstream.text();
  if (!upstream.ok) return res.status(upstream.status).json({ error: text || "Failed to load modules" });
  return res.status(200).json(JSON.parse(text));
}
