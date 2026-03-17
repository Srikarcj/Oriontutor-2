import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { applyRateLimit } from "../../../lib/server/rate-limit";
import { readRequired, serverEnv } from "../../../lib/server/env";
import { quizSubmitSchema } from "../../../lib/validation/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: "quiz-submit" });
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = quizSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid request" });
  }

  const backendUrl = readRequired("BACKEND_URL");
  const upstream = await fetch(`${backendUrl}/api/quiz/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
      ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
    },
    body: JSON.stringify(parsed.data),
  });

  const text = await upstream.text();
  if (!upstream.ok) return res.status(upstream.status).json({ error: text || "Quiz submit failed" });
  return res.status(200).json(JSON.parse(text));
}
