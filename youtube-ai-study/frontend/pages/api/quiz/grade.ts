import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse<{ score: number } | { error: string }>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const correct = Array.isArray(req.body?.correct) ? req.body.correct : [];
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const total = correct.length || 1;
  let hits = 0;
  correct.forEach((value, idx) => {
    if ((answers[idx] || "").toString().toLowerCase() === value.toString().toLowerCase()) hits += 1;
  });
  const score = Math.round((hits / total) * 100);
  return res.status(200).json({ score });
}
