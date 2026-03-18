import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { readRequired, serverEnv } from "../../../lib/server/env";
import { applyRateLimit } from "../../../lib/server/rate-limit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const backendUrl = readRequired("BACKEND_URL");
  const courseSlug = typeof req.query.course_slug === "string" ? req.query.course_slug : "";

  if (req.method === "GET") {
    const upstream = await fetch(
      `${backendUrl}/api/knowledge/documents${courseSlug ? `?course_slug=${encodeURIComponent(courseSlug)}` : ""}`,
      {
        headers: {
          "X-User-Id": userId,
          ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
        },
      }
    );
    const text = await upstream.text();
    if (!upstream.ok) return res.status(upstream.status).json({ error: text || "Failed to load documents" });
    return res.status(200).json(JSON.parse(text));
  }

  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "Method not allowed" });
}
