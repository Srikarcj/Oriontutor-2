import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { askQuestionSchema } from "../../../lib/validation/schemas";
import { serverEnv } from "../../../lib/server/env";
import { getVideoForUser } from "../../../lib/server/data";

function deriveBackendVideoId(inputId: string): string {
  const raw = String(inputId || "").trim();
  if (!raw) return inputId;
  const pieces = raw.split("_").filter(Boolean);
  if (pieces.length > 1) {
    return pieces[pieces.length - 1] || raw;
  }
  return raw;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ detail: "Unauthorized" });
  }

  const parsed = askQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ detail: parsed.error.issues[0]?.message || "Invalid request" });
  }

  const video = await getVideoForUser(auth.userId, parsed.data.video_id);

  let upstream: Response;
  const backendVideoId = video
    ? typeof (video as any)?.source_video_id === "string" && (video as any).source_video_id
      ? (video as any).source_video_id
      : deriveBackendVideoId(String((video as any)?.id || parsed.data.video_id))
    : deriveBackendVideoId(parsed.data.video_id);
  try {
    upstream = await fetch(`${serverEnv.backendUrl}/api/qa/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: backendVideoId,
        question: parsed.data.question,
      }),
    });
  } catch {
    return res.status(502).json({
      detail: `Backend service unreachable at ${serverEnv.backendUrl}. Start backend and retry.`,
    });
  }

  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return res.status(upstream.status).json({ detail: text || "Q&A service failure" });
  }

  try {
    return res.status(upstream.status).json(JSON.parse(text || "{}"));
  } catch {
    return res.status(502).json({ detail: "Invalid response from Q&A backend." });
  }
}
