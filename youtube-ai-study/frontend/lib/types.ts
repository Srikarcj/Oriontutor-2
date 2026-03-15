export type PlanTier = "free" | "pro";

export type Notes = {
  title: string;
  overview: string;
  main_concepts: string[];
  detailed_explanation: string;
  examples: string[];
  key_takeaways: string[];
};

export type MindMapNode = {
  name: string;
  explanation?: string;
  timestamps?: string[];
  children?: MindMapNode[];
};

export type MindMapData = {
  main_topic: string;
  concepts: MindMapNode[];
};

export type Flashcard = {
  question: string;
  answer: string;
  category?: "key_concept" | "definition" | "explanation" | string;
  difficulty?: "easy" | "medium" | "hard" | string;
  bullets?: string[];
  position?: number;
  learned?: boolean;
};

export type VisualInsight = {
  timestamp?: string;
  seconds?: number;
  visual_type?: string;
  title?: string;
  image_url?: string;
  ai_explanation?: string;
  bullets?: string[];
  tags?: string[];
  key_moment?: boolean;
  created_at?: string;
};

export type VideoContent = {
  transcript: string;
  summary: string;
  notes: Notes;
  chapters: string[];
  quiz: string[];
  pdf_url: string | null;
  mindmap?: MindMapData | any;
  flashcards?: Flashcard[];
  visual_insights?: VisualInsight[];
};

export type VideoRecord = {
  id: string;
  user_id: string;
  youtube_url: string;
  title: string;
  thumbnail: string;
  source_video_id: string;
  created_at: string;
};

export type UserPlan = {
  plan: PlanTier;
  monthUsage: number;
  monthlyLimit: number | null;
};

export type LibraryItem = {
  id: string;
  youtube_url: string;
  title: string;
  thumbnail: string;
  created_at: string;
  content: {
    summary: string;
    notes: Notes;
    chapters: string[];
    quiz: string[];
    pdf_url: string | null;
    topics?: string[];
    mindmap?: MindMapData | any;
    flashcards?: Flashcard[];
    visual_insights?: VisualInsight[];
  } | null;
};
