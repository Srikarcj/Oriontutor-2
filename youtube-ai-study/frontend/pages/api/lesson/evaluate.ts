import type { NextApiRequest, NextApiResponse } from "next";

type EvaluationResponse = {
  score: number;
  clarity: number;
  keywordMatch: number;
  confidence: number;
  feedback: string;
  unlock: boolean;
};

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export default function handler(req: NextApiRequest, res: NextApiResponse<EvaluationResponse | { error: string }>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const transcript = typeof req.body?.transcript === "string" ? req.body.transcript : "";
  const keywords = Array.isArray(req.body?.keywords) ? req.body.keywords : [];
  const clarityInput = Number(req.body?.clarity ?? 3);
  const confidenceInput = Number(req.body?.confidence ?? 3);

  const transcriptWords = transcript.toLowerCase();
  const keywordHits = keywords.filter((kw: string) => transcriptWords.includes(kw.toLowerCase())).length;
  const keywordMatch = keywords.length ? Math.round((keywordHits / keywords.length) * 100) : 0;

  const clarity = clamp(Math.round((clarityInput / 5) * 100), 0, 100);
  const confidence = clamp(Math.round((confidenceInput / 5) * 100), 0, 100);
  const lengthBonus = clamp(Math.round(Math.min(transcript.length / 12, 100)), 0, 100);

  const score = clamp(Math.round(keywordMatch * 0.45 + clarity * 0.2 + confidence * 0.2 + lengthBonus * 0.15), 0, 100);
  const unlock = score >= 60;
  const feedback = unlock
    ? "Great work. You explained the concept clearly and hit the key terms."
    : "Re-record with clearer voice and mention the key concepts to improve your score.";

  return res.status(200).json({ score, clarity, keywordMatch, confidence, feedback, unlock });
}
