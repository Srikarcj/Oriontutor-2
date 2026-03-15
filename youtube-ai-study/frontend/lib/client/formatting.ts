import type { Notes } from "../types";

const fillerRegex = /\b(um|uh|like|you know|i mean|sort of|kind of|basically)\b/gi;
const multiSpaceRegex = /\s{2,}/g;

const defaultKeywords = [
  "important",
  "key",
  "definition",
  "concept",
  "principle",
  "takeaway",
  "summary",
  "remember",
  "insight",
];

export function cleanTranscript(text: string): string {
  if (!text) return "";
  return text
    .replace(fillerRegex, "")
    .replace(/[\t\r]+/g, " ")
    .replace(multiSpaceRegex, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

export function splitSentences(text: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/\n+/g, " ").replace(multiSpaceRegex, " ").trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function makeBullets(text: string, max = 8): string[] {
  const sentences = splitSentences(text);
  const bullets = sentences.slice(0, max);
  if (bullets.length >= 5) return bullets;

  const fallback = text
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...bullets, ...fallback].slice(0, max);
  return merged.length ? merged : bullets;
}

export function highlightKeywords(text: string, keywords: string[] = defaultKeywords) {
  if (!text) return [{ value: "", bold: false }];
  const pattern = new RegExp(`\\b(${keywords.join("|")})\\b`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, index) => ({
    value: part,
    bold: index % 2 === 1,
  }));
}

export function buildSummaryBullets(summary: string, notes?: Notes | null): string[] {
  const base = summary || notes?.overview || "";
  const bullets = makeBullets(base, 10);
  if (bullets.length >= 5) return bullets;

  const extras = [
    ...(notes?.main_concepts || []),
    ...(notes?.key_takeaways || []),
  ]
    .map((item) => String(item).trim())
    .filter(Boolean);

  const merged = [...bullets, ...extras].slice(0, 10);
  return merged.length ? merged : bullets;
}

export function buildTranscriptBlocks(text: string, groupSize = 3): string[] {
  const withoutTimestamps = text
    .split("\n")
    .map((line) => line.replace(/^(\d{1,2}:\d{2})\s+/, ""))
    .join(" ");
  const cleaned = cleanTranscript(withoutTimestamps);
  const sentences = splitSentences(cleaned);
  if (!sentences.length) return [];
  const blocks: string[] = [];
  for (let i = 0; i < sentences.length; i += groupSize) {
    blocks.push(sentences.slice(i, i + groupSize).join(" "));
  }
  return blocks;
}

export function parseTranscriptSegments(text: string): Array<{
  timestamp: string;
  seconds: number;
  line: string;
}> {
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const segments = lines.map((line) => {
    const match = line.match(/^(\d{1,2}:\d{2})\s+(.*)$/);
    if (!match) {
      return { timestamp: "", seconds: 0, line };
    }
    const timestamp = match[1];
    const content = match[2];
    const [mm, ss] = timestamp.split(":").map((v) => parseInt(v, 10) || 0);
    const seconds = mm * 60 + ss;
    return { timestamp, seconds, line: content };
  });
  return segments;
}

export function formatAnswerBullets(answer: string): string[] {
  if (!answer) return [];
  if (answer.includes("\n")) {
    const lines = answer
      .split("\n")
      .map((line) => line.replace(/^[-•\d.]+\s*/, "").trim())
      .filter(Boolean);
    if (lines.length) return lines.slice(0, 8);
  }
  return makeBullets(answer, 6);
}
