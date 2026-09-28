import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfigured } from "@/lib/cms/mode";

function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
}

/** Server-only service role key. Never use in client code or NEXT_PUBLIC_* */
export function resolveSupabaseServiceRoleKey(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

export function supabaseServiceRoleConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(supabaseConfigured(env) && resolveSupabaseServiceRoleKey(env));
}

export function createSupabaseServiceClient(): SupabaseClient {
  const url = supabaseUrl();
  const key = resolveSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error("Supabase service role is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
