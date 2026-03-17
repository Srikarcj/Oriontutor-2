import type { NextApiRequest, NextApiResponse } from "next";
import { applyRateLimit } from "../../lib/server/rate-limit";

function buildAnswer(message: string) {
  const text = message.toLowerCase();
  if (text.includes("quiz")) {
    return "Try this quiz flow: review the lecture highlights, answer the multiple choice question, and explain one concept out loud. I can generate a new quiz if you tell me the topic.";
  }
  if (text.includes("project") || text.includes("capstone")) {
    return "Break the capstone into weekly milestones: scope, data or requirements, build, test, and deploy. Share your topic and I will propose a checklist.";
  }
  if (text.includes("study plan") || text.includes("schedule")) {
    return "Set a 30 minute daily slot, complete the lecture, then record a 90 second explanation video. I can create a reminder cadence if you share your preferred time.";
  }
  return "I can explain lessons step by step, recommend materials, or help you prepare for quizzes. Tell me the course, lesson, or skill you want to focus on.";
}

export default function handler(req: NextApiRequest, res: NextApiResponse<{ answer: string } | { error: string }>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 60, keyPrefix: "ai-tutor" });
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests" });
  }
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  if (!message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }
  if (message.length > 2000) {
    return res.status(413).json({ error: "Message too long" });
  }
  return res.status(200).json({ answer: buildAnswer(message) });
}
