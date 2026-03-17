import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readRequired } from "./env";

let singleton: SupabaseClient<any, "public", any> | null = null;

function fetchWithTimeout(timeoutMs = 10_000) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

export function getDb() {
  if (!singleton) {
    singleton = createClient<any>(readRequired("SUPABASE_URL"), readRequired("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout(10_000) },
    });
  }

  return singleton;
}
