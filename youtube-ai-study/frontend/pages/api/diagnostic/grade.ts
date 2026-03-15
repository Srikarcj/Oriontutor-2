import type { NextApiRequest, NextApiResponse } from "next";

type DiagnosticResponse = {
  score: number;
  level: "Beginner" | "Intermediate" | "Advanced";
};

const correctAnswers = ["b", "c", "true", "a", "b"];

function getLevel(score: number): DiagnosticResponse["level"] {
  if (score <= 40) return "Beginner";
  if (score <= 70) return "Intermediate";
  return "Advanced";
}

export default function handler(req: NextApiRequest, res: NextApiResponse<DiagnosticResponse | { error: string }>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const total = correctAnswers.length || 1;
  let correct = 0;
  correctAnswers.forEach((ans, idx) => {
    if ((answers[idx] || "").toString().toLowerCase() === ans) correct += 1;
  });
  const score = Math.round((correct / total) * 100);
  return res.status(200).json({ score, level: getLevel(score) });
}
