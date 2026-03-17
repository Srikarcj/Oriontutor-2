import type { NextApiRequest, NextApiResponse } from "next";
import { applyRateLimit } from "../../../lib/server/rate-limit";
import { readRequired, serverEnv } from "../../../lib/server/env";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: "quiz-get" });
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests" });

  const quizId = typeof req.query.quiz_id === "string" ? req.query.quiz_id : "";
  if (!quizId) return res.status(400).json({ error: "quiz_id required" });

  const backendUrl = readRequired("BACKEND_URL");
  const upstream = await fetch(`${backendUrl}/api/quiz?quiz_id=${encodeURIComponent(quizId)}`, {
    method: "GET",
    headers: {
      ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
    },
  });

  const text = await upstream.text();
  if (!upstream.ok) return res.status(upstream.status).json({ error: text || "Failed to load quiz" });
  return res.status(200).json(JSON.parse(text));
}
