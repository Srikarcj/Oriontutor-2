import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { applyRateLimit } from "../../../lib/server/rate-limit";
import { readRequired, serverEnv } from "../../../lib/server/env";
import { courseContentSchema } from "../../../lib/validation/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: "courses-content" });
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = courseContentSchema.safeParse({
    course_id: typeof req.query.course_id === "string" ? req.query.course_id : undefined,
    course_slug: typeof req.query.course_slug === "string" ? req.query.course_slug : undefined,
  });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid request" });
  }

  const backendUrl = readRequired("BACKEND_URL");
  const courseId = parsed.data.course_id || parsed.data.course_slug || "";
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
