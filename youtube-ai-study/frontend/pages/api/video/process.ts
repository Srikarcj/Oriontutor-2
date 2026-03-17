import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import type { Notes } from "../../../lib/types";
import { processVideoSchema, getYouTubeThumbnail } from "../../../lib/validation/schemas";
import { serverEnv } from "../../../lib/server/env";
import { findVideoByUrl, getUserPlanUsage, saveVideoResult, upsertUser } from "../../../lib/server/data";
import { applyRateLimit } from "../../../lib/server/rate-limit";

function sanitizeNotes(value: any): Notes {
  const detailed = value?.detailed_explanation;
  let detailedValue = "";
  if (typeof detailed === "string") {
    detailedValue = detailed;
  } else if (detailed && typeof detailed === "object") {
    try {
      detailedValue = JSON.stringify(detailed, null, 2);
    } catch {
      detailedValue = "";
    }
  }
  return {
    title: typeof value?.title === "string" ? value.title : "Untitled",
    overview: typeof value?.overview === "string" ? value.overview : "",
    main_concepts: Array.isArray(value?.main_concepts) ? value.main_concepts.map(String) : [],
    detailed_explanation: detailedValue,
    examples: Array.isArray(value?.examples) ? value.examples.map(String) : [],
    key_takeaways: Array.isArray(value?.key_takeaways) ? value.key_takeaways.map(String) : [],
  };
}

function sanitizeArray(value: any): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function safeParseJson(input: string) {
  try {
    return input ? JSON.parse(input) : {};
  } catch {
    return {};
  }
}

function sanitizeFlashcards(value: any) {
  if (!Array.isArray(value)) return [];
  return value.map((card) => ({
    question: typeof card?.question === "string" ? card.question : "",
    answer: typeof card?.answer === "string" ? card.answer : "",
    category: typeof card?.category === "string" ? card.category : undefined,
    difficulty: typeof card?.difficulty === "string" ? card.difficulty : undefined,
    bullets: Array.isArray(card?.bullets) ? card.bullets.map(String) : undefined,
  })).filter((card) => card.question || card.answer);
}

const BACKEND_TIMEOUT_MS = 20 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ detail: "Method not allowed" });
    }

    const limit = applyRateLimit(req, res, { windowMs: 60_000, max: 30, keyPrefix: "video-process" });
    if (!limit.allowed) {
      return res.status(429).json({ detail: "Too many requests" });
    }

    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ detail: "Unauthorized" });
    }

    const parsed = processVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ detail: parsed.error.issues[0]?.message || "Invalid request." });
    }

    const youtubeUrl = parsed.data.youtube_url;
    const email = String((auth.sessionClaims?.email as string) || `${auth.userId}@unknown.local`);

    await upsertUser({ clerk_user_id: auth.userId, email });

    const usage = await getUserPlanUsage(auth.userId);
    const cached = await findVideoByUrl(auth.userId, youtubeUrl);
    const cachedContent = Array.isArray((cached as any)?.video_content)
      ? (cached as any).video_content[0]
      : (cached as any)?.video_content;
    const cachedNotes = (cached as any)?.notes_row;
    const cachedMindmap = (cached as any)?.mindmap_row;
    const cachedFlashcards = (cached as any)?.flashcards_rows;
    const cachedVisualInsights = (cached as any)?.visual_insights_rows;
    if (cached && cachedContent) {
      const content = cachedContent as any;
      return res.status(200).json({
        video_id: cached.id,
        title: cached.title,
        thumbnail: cached.thumbnail,
      notes: sanitizeNotes(content.notes),
      transcript: content.transcript || "",
      summary: content.summary || "",
      chapters: sanitizeArray(content.chapters),
        quiz: sanitizeArray(content.quiz),
        pdf_url: content.pdf_url || null,
        mindmap: cachedMindmap?.mindmap_json || null,
        flashcards: cachedFlashcards || [],
        visual_insights: cachedVisualInsights || [],
        cached: true,
        plan: usage.plan,
        usage,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    let upstream: Response;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (serverEnv.backendApiKey) {
        headers["X-Internal-API-Key"] = serverEnv.backendApiKey;
      }
      upstream = await fetch(`${serverEnv.backendUrl}/api/video/process`, {
        method: "POST",
        headers,
        body: JSON.stringify({ youtube_url: youtubeUrl }),
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({
          detail: "Video analysis timed out. Please check backend service logs and try again.",
        });
      }

      return res.status(502).json({
        detail: `Backend service unreachable at ${serverEnv.backendUrl}. Start backend and retry.`,
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok) {
      if (contentType.includes("application/json")) {
        const data = safeParseJson(text);
        return res.status(upstream.status).json(data);
      }

      return res.status(upstream.status).json({ detail: text || "Video processing failed." });
    }

    const data = contentType.includes("application/json") ? safeParseJson(text) : {};
    const notes = sanitizeNotes(data.notes);
    const summary = typeof data.summary === "string" ? data.summary : notes.overview;
    const chapters = sanitizeArray(data.chapters);
    const quiz = sanitizeArray(data.quiz);
    const transcript = typeof data.transcript === "string" ? data.transcript : "";
    const mindmap = typeof data.mindmap === "object" ? data.mindmap : null;
    const flashcards = sanitizeFlashcards(data.flashcards);
    const visualInsights = Array.isArray(data.visual_insights) ? data.visual_insights : [];
    const sourceVideoId = typeof data.video_id === "string" ? data.video_id : `${Date.now()}`;
    const pdfUrlRaw = typeof data.pdf_url === "string" ? data.pdf_url : null;
    const fullPdfUrl = pdfUrlRaw?.startsWith("/") ? `${serverEnv.backendUrl}${pdfUrlRaw}` : pdfUrlRaw;

    const title = typeof data.title === "string" ? data.title : notes.title;
    const thumbnail = typeof data.thumbnail === "string" && data.thumbnail ? data.thumbnail : getYouTubeThumbnail(youtubeUrl);
    const appVideoId = `${auth.userId}_${sourceVideoId}`;

    const persistedVideoId = await saveVideoResult({
      id: appVideoId,
      sourceVideoId,
      userId: auth.userId,
      youtubeUrl,
      title,
      thumbnail,
      transcript,
      summary,
      notes,
      chapters,
      quiz,
      pdfUrl: fullPdfUrl,
      mindmap,
      flashcards,
      visualInsights,
    });
    const responseVideoId = persistedVideoId || appVideoId;

    return res.status(200).json({
      video_id: responseVideoId,
      source_video_id: sourceVideoId,
      title,
      thumbnail,
      notes,
      transcript,
      summary,
      chapters,
      quiz,
      pdf_url: fullPdfUrl,
      mindmap,
      flashcards,
      visual_insights: visualInsights,
      cached: false,
      plan: usage.plan,
      usage,
    });
  } catch (error: any) {
    return res.status(500).json({ detail: error?.message || "Failed to process video." });
  }
}
