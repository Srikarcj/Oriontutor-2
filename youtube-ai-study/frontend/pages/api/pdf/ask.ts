import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { readRequired, serverEnv } from "../../../lib/server/env";
import { pdfAskSchema } from "../../../lib/validation/schemas";
import { applyRateLimit } from "../../../lib/server/rate-limit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: "pdf-ask" });
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = pdfAskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid request" });
  }

  const backendUrl = readRequired("BACKEND_URL");
  const upstream = await fetch(`${backendUrl}/api/pdf/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
      ...(serverEnv.backendApiKey ? { "X-Internal-API-Key": serverEnv.backendApiKey } : {}),
    },
    body: JSON.stringify({ document_id: parsed.data.id, question: parsed.data.question }),
  });

  const text = await upstream.text();
  if (!upstream.ok) return res.status(upstream.status).json({ error: text || "PDF QA failed" });
  return res.status(200).json(JSON.parse(text));
}
