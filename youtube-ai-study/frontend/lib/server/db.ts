import { createClient } from "@supabase/supabase-js";
import { readRequired } from "./env";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_user_id: string;
          email: string;
          plan: "free" | "pro";
          created_at: string;
          updated_at: string;
        };
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          youtube_url: string;
          title: string;
          thumbnail: string;
          source_video_id: string;
          created_at: string;
        };
      };
      video_content: {
        Row: {
          id: string;
          video_id: string;
          transcript: string;
          summary: string;
          notes: Json;
          chapters: Json;
          quiz: Json;
          pdf_url: string | null;
          created_at: string;
        };
      };
      library: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          saved_at: string;
        };
      };
    };
  };
};

let singleton: ReturnType<typeof createClient<Database>> | null = null;

export function getDb() {
  if (!singleton) {
    singleton = createClient<Database>(readRequired("SUPABASE_URL"), readRequired("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return singleton;
}
