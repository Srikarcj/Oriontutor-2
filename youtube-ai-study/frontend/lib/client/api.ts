import type { LibraryItem } from "../types";

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any).detail || "Request failed");
  }
  return data as T;
}

export type PlanResponse = {
  user: {
    clerk_user_id: string;
    email: string;
    plan: "free" | "pro";
  };
  usage: {
    plan: "free" | "pro";
    monthUsage: number;
    monthlyLimit: number | null;
  };
};

export type LibraryResponse = { items: LibraryItem[] };

export type VideoDetailResponse = {
  id: string;
  title: string;
  thumbnail: string;
  youtube_url: string;
  created_at: string;
  transcript: string;
  summary: string;
  notes: any;
  chapters: string[];
  quiz: string[];
  pdf_url: string | null;
  mindmap?: any;
  flashcards?: Array<{ question: string; answer: string; category?: string; difficulty?: string; bullets?: string[] }>;
  visual_insights?: Array<{
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
  plan: "free" | "pro";
};
