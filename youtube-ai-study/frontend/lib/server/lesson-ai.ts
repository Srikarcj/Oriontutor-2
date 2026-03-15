import { readRequired } from "./env";

export type LessonPackage = {
  notes: {
    title: string;
    overview: string;
    breakdown: string[];
    steps: string[];
    key_points: string[];
    examples: string[];
    summary: string;
  };
  quiz: Array<{
    question_type: string;
    prompt: string;
    options?: string[];
    answer: string;
    explanation?: string;
    difficulty?: string;
  }>;
};

export async function generateLessonPackage(input: {
  title: string;
  summary?: string;
  content?: string;
  keywords?: string[];
}) {
  const backendUrl = readRequired("BACKEND_URL");
  const response = await fetch(`${backendUrl}/api/lessons/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to generate lesson package");
  }
  return (await response.json()) as LessonPackage;
}
