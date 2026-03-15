import { createClient } from "@supabase/supabase-js";
import { readRequired } from "./env";

let singleton: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!singleton) {
    singleton = createClient(readRequired("SUPABASE_URL"), readRequired("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return singleton;
}
