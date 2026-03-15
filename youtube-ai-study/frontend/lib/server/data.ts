import type { Notes } from "../types";
import { getDb } from "./db";
import { limitForPlan, monthStart, normalizePlan } from "../plans";

type UserRow = {
  clerk_user_id: string;
  email: string;
  plan?: "free" | "pro";
};

export async function upsertUser(row: UserRow) {
  const db = getDb();
  const payload: Record<string, string> = {
    clerk_user_id: row.clerk_user_id,
    email: row.email,
  };

  const { data, error } = await db
    .from("users")
    .upsert(payload, { onConflict: "clerk_user_id" })
    .select("*")
    .single();

  if (error) return null;
  return data;
}

export async function getUserByClerkId(clerkUserId: string) {
  const db = getDb();
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getUserPlanUsage(clerkUserId: string) {
  const db = getDb();
  let plan = normalizePlan(undefined);
  try {
    const user = await getUserByClerkId(clerkUserId);
    plan = normalizePlan((user as any)?.plan);
  } catch {
    plan = "free";
  }

  const { count, error } = await db
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", clerkUserId)
    .gte("created_at", monthStart());

  if (error) {
    return {
      plan,
      monthUsage: 0,
      monthlyLimit: limitForPlan(plan),
    };
  }

  return {
    plan,
    monthUsage: count || 0,
    monthlyLimit: limitForPlan(plan),
  };
}

export async function findVideoByUrl(clerkUserId: string, youtubeUrl: string) {
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select("*")
    .eq("user_id", clerkUserId)
    .eq("youtube_url", youtubeUrl)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const { data: content } = await db
    .from("video_content")
    .select("summary,notes,chapters,quiz,pdf_url,transcript")
    .eq("video_id", (data as any).id)
    .maybeSingle();

  const { data: notesRow } = await db
    .from("notes")
    .select("summary,structured_notes,transcript,topics")
    .eq("video_id", (data as any).id)
    .maybeSingle();

  const { data: mindmapRow } = await db
    .from("mindmap")
    .select("mindmap_json")
    .eq("video_id", (data as any).id)
    .maybeSingle();

  const { data: flashcardsRows } = await db
    .from("flashcards")
    .select("question,answer,category,difficulty,bullets,position,learned")
    .eq("video_id", (data as any).id)
    .order("position", { ascending: true });

  const { data: visualInsightsRows } = await db
    .from("visual_insights")
    .select("timestamp,seconds,visual_type,title,image_url,ai_explanation,bullets,tags,key_moment,created_at")
    .eq("video_id", (data as any).id)
    .order("seconds", { ascending: true });

  return {
    ...data,
    video_content: content || null,
    notes_row: notesRow || null,
    mindmap_row: mindmapRow || null,
    flashcards_rows: flashcardsRows || [],
    visual_insights_rows: visualInsightsRows || [],
  };
}

export async function saveVideoResult(input: {
  id: string;
  sourceVideoId: string;
  userId: string;
  youtubeUrl: string;
  title: string;
  thumbnail: string;
  transcript: string;
  summary: string;
  notes: Notes;
  chapters: string[];
  quiz: string[];
  pdfUrl: string | null;
  mindmap?: any;
  flashcards?: Array<{ question: string; answer: string; category?: string; difficulty?: string; bullets?: string[] }>;
  visualInsights?: Array<{
    timestamp?: string;
    seconds?: number;
    visual_type?: string;
    title?: string;
    image_url?: string;
    ai_explanation?: string;
    bullets?: string[];
    tags?: string[];
    key_moment?: boolean;
  }>;
}): Promise<string | null> {
  const db = getDb();

  const existing = await db
    .from("videos")
    .select("id")
    .eq("user_id", input.userId)
    .eq("youtube_url", input.youtubeUrl)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let savedVideoId: string | null = (existing.data as any)?.id || null;

  if (!savedVideoId) {
    const insertVariants: Array<Record<string, any>> = [
      {
        id: input.id,
        user_id: input.userId,
        source_video_id: input.sourceVideoId,
        youtube_url: input.youtubeUrl,
        title: input.title,
        thumbnail: input.thumbnail,
      },
      {
        user_id: input.userId,
        source_video_id: input.sourceVideoId,
        youtube_url: input.youtubeUrl,
        title: input.title,
        thumbnail: input.thumbnail,
      },
      {
        user_id: input.userId,
        youtube_url: input.youtubeUrl,
        title: input.title,
        thumbnail: input.thumbnail,
      },
    ];

    for (const payload of insertVariants) {
      const inserted = await db.from("videos").insert(payload).select("id").single();
      if (!inserted.error && (inserted.data as any)?.id) {
        savedVideoId = String((inserted.data as any).id);
        break;
      }
    }
  } else {
    // Keep title/thumbnail fresh for existing rows.
    await db
      .from("videos")
      .update({ title: input.title, thumbnail: input.thumbnail })
      .eq("id", savedVideoId);
  }

  if (!savedVideoId) {
    return null;
  }

  const { error: contentError } = await db.from("video_content").upsert(
    {
      video_id: savedVideoId,
      transcript: input.transcript,
      summary: input.summary,
      notes: input.notes,
      chapters: input.chapters,
      quiz: input.quiz,
      pdf_url: input.pdfUrl,
    },
    { onConflict: "video_id" }
  );

  if (contentError) {
    const { error: updateError } = await db
      .from("video_content")
      .update({
        transcript: input.transcript,
        summary: input.summary,
        notes: input.notes,
        chapters: input.chapters,
        quiz: input.quiz,
        pdf_url: input.pdfUrl,
      })
      .eq("video_id", savedVideoId);
    if (updateError) {
      const { error: insertError } = await db.from("video_content").insert({
        video_id: savedVideoId,
        transcript: input.transcript,
        summary: input.summary,
        notes: input.notes,
        chapters: input.chapters,
        quiz: input.quiz,
        pdf_url: input.pdfUrl,
      });
      if (insertError) return savedVideoId;
    }
  }

  const topics = Array.isArray(input.notes?.main_concepts)
    ? input.notes.main_concepts.slice(0, 8)
    : [];

  await db.from("notes").upsert(
    {
      video_id: savedVideoId,
      summary: input.summary,
      structured_notes: input.notes,
      transcript: input.transcript,
      topics,
    },
    { onConflict: "video_id" }
  );

  if (input.mindmap) {
    await db.from("mindmap").upsert(
      {
        video_id: savedVideoId,
        mindmap_json: input.mindmap,
      },
      { onConflict: "video_id" }
    );
  }

  if (Array.isArray(input.flashcards) && input.flashcards.length) {
    await db.from("flashcards").delete().eq("video_id", savedVideoId);
    const payload = input.flashcards.map((card, idx) => ({
      video_id: savedVideoId,
      question: String(card.question || ""),
      answer: String(card.answer || ""),
      category: card.category || null,
      difficulty: card.difficulty || null,
      bullets: Array.isArray(card.bullets) ? card.bullets : null,
      position: idx,
    }));
    if (payload.length) {
      await db.from("flashcards").insert(payload);
    }
  }

  if (Array.isArray(input.visualInsights)) {
    await db.from("visual_insights").delete().eq("video_id", savedVideoId);
    const payload = input.visualInsights.map((item) => ({
      video_id: savedVideoId,
      timestamp: item.timestamp || null,
      seconds: item.seconds ?? null,
      visual_type: item.visual_type || null,
      title: item.title || null,
      image_url: item.image_url || null,
      extracted_text: null,
      ai_explanation: item.ai_explanation || null,
      bullets: Array.isArray(item.bullets) ? item.bullets : null,
      tags: Array.isArray(item.tags) ? item.tags : null,
      key_moment: Boolean(item.key_moment),
    }));
    if (payload.length) {
      await db.from("visual_insights").insert(payload);
    }
  }

  const { data: existingLibrary } = await db
    .from("library")
    .select("id")
    .eq("user_id", input.userId)
    .eq("video_id", savedVideoId)
    .maybeSingle();

  if (!existingLibrary) {
    const { error: libraryInsertError } = await db.from("library").insert({
      user_id: input.userId,
      video_id: savedVideoId,
    });
    if (libraryInsertError) return savedVideoId;
  }

  return savedVideoId;
}

export async function listUserLibrary(clerkUserId: string) {
  const db = getDb();
  const { data, error } = await db
    .from("library")
    .select("saved_at,video_id")
    .eq("user_id", clerkUserId)
    .order("saved_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load library.");
  }
  const rows = data || [];
  if (rows.length === 0) return [];

  const videoIds = rows.map((r: any) => r.video_id);
  const { data: videos, error: videosError } = await db
    .from("videos")
    .select("id,youtube_url,title,thumbnail,created_at")
    .in("id", videoIds);
  if (videosError) return [];

  const { data: contents } = await db
    .from("video_content")
    .select("video_id,summary,notes,chapters,quiz,pdf_url")
    .in("video_id", videoIds);

  const { data: notesRows } = await db
    .from("notes")
    .select("video_id,summary,structured_notes,topics")
    .in("video_id", videoIds);

  const { data: mindmapRows } = await db
    .from("mindmap")
    .select("video_id,mindmap_json")
    .in("video_id", videoIds);

  const { data: flashcardRows } = await db
    .from("flashcards")
    .select("video_id,question,answer,category,difficulty,bullets,position,learned")
    .in("video_id", videoIds);

  const { data: visualInsightRows } = await db
    .from("visual_insights")
    .select("video_id,timestamp,seconds,visual_type,title,image_url,ai_explanation,bullets,tags,key_moment,created_at")
    .in("video_id", videoIds);

  const videoMap = new Map((videos || []).map((v: any) => [v.id, v]));
  const contentMap = new Map((contents || []).map((c: any) => [c.video_id, c]));
  const notesMap = new Map((notesRows || []).map((n: any) => [n.video_id, n]));
  const mindmapMap = new Map((mindmapRows || []).map((m: any) => [m.video_id, m]));
  const flashcardsMap = new Map((flashcardRows || []).map((f: any) => [f.video_id, f]));
  const visualInsightsMap = new Map((visualInsightRows || []).map((v: any) => [v.video_id, v]));

  return rows.map((row: any) => {
    const video = videoMap.get(row.video_id);
    const content = contentMap.get(row.video_id);
    const notesRow = notesMap.get(row.video_id);
    const mindmapRow = mindmapMap.get(row.video_id);
    const flashcards = (flashcardRows || []).filter((f: any) => f.video_id === row.video_id);
    const visualInsights = (visualInsightRows || []).filter((v: any) => v.video_id === row.video_id);
    return {
      saved_at: row.saved_at,
      videos: video
        ? {
            ...video,
            video_content: content || null,
            notes_row: notesRow || null,
            mindmap_row: mindmapRow || null,
            flashcards_rows: flashcards,
            visual_insights_rows: visualInsights,
          }
        : null,
    };
  }).filter((x) => x.videos);
}

export async function getVideoForUser(clerkUserId: string, videoId: string) {
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select("*")
    .eq("user_id", clerkUserId)
    .eq("id", videoId)
    .maybeSingle();

  let video = data as any;
  if (!video) {
    // If videos.user_id is inconsistent, rely on library ownership.
    const ownedByLibrary = await db
      .from("library")
      .select("video_id")
      .eq("user_id", clerkUserId)
      .eq("video_id", videoId)
      .maybeSingle();
    if (ownedByLibrary.data?.video_id) {
      const ownedVideo = await db
        .from("videos")
        .select("*")
        .eq("id", ownedByLibrary.data.video_id)
        .maybeSingle();
      video = ownedVideo.data as any;
    }
  }

  if ((!video || error) && typeof videoId === "string") {
    // Backward compatibility: try source id candidates extracted from composite id.
    const candidates = new Set<string>();
    candidates.add(videoId);
    const parts = videoId.split("_");
    if (parts.length > 1) {
      candidates.add(parts[parts.length - 1]);
      candidates.add(parts.slice(2).join("_"));
      candidates.add(parts.slice(1).join("_"));
    }
    if (videoId.length >= 11) {
      candidates.add(videoId.slice(-11)); // YouTube ids are typically length 11.
    }

    for (const sourceCandidate of candidates) {
      if (!sourceCandidate) continue;
      const fallback = await db
        .from("videos")
        .select("*")
        .eq("source_video_id", sourceCandidate)
        .maybeSingle();
      if (fallback.data) {
        // Ensure requesting user owns this video via library or direct user_id.
        const lib = await db
          .from("library")
          .select("id")
          .eq("user_id", clerkUserId)
          .eq("video_id", (fallback.data as any).id)
          .maybeSingle();
        if (lib.data || (fallback.data as any).user_id === clerkUserId) {
          video = fallback.data as any;
          break;
        }
      }
    }
  }

  if (!video) return null;

  const { data: content } = await db
    .from("video_content")
    .select("transcript,summary,notes,chapters,quiz,pdf_url")
    .eq("video_id", video.id)
    .maybeSingle();

  const { data: notesRow } = await db
    .from("notes")
    .select("summary,structured_notes,transcript,topics")
    .eq("video_id", video.id)
    .maybeSingle();

  const { data: mindmapRow } = await db
    .from("mindmap")
    .select("mindmap_json")
    .eq("video_id", video.id)
    .maybeSingle();

  const { data: flashcardsRows } = await db
    .from("flashcards")
    .select("question,answer,category,difficulty,bullets,position,learned")
    .eq("video_id", video.id)
    .order("position", { ascending: true });

  const { data: visualInsightsRows } = await db
    .from("visual_insights")
    .select("timestamp,seconds,visual_type,title,image_url,ai_explanation,bullets,tags,key_moment,created_at")
    .eq("video_id", video.id)
    .order("seconds", { ascending: true });

  return {
    ...video,
    video_content: content || null,
    notes_row: notesRow || null,
    mindmap_row: mindmapRow || null,
    flashcards_rows: flashcardsRows || [],
    visual_insights_rows: visualInsightsRows || [],
  };
}
