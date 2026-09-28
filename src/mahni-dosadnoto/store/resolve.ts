import "server-only";

import { isInternetFacing, type EnvMap } from "@/lib/env-runtime";
import { supabaseServiceRoleConfigured } from "@/lib/cms/supabase-service";
import type { MahniStore } from "./types";
import { getMemoryStore } from "./memory";
import { SupabaseMahniStore, MahniStoreUnavailableError } from "./supabase/store";

export type MahniStoreBackend = "supabase" | "memory";

export class MahniStoreConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MahniStoreConfigurationError";
  }
}

/**
 * Explicit backend selection:
 * - Vercel preview/production: Supabase + service role only (fail if missing).
 * - Local/test: memory when MAHNI_STORE=memory or Supabase is not fully configured.
 */
export function resolveMahniStoreBackend(env: EnvMap = process.env as EnvMap): MahniStoreBackend {
  const forced = env.MAHNI_STORE?.trim().toLowerCase();
  if (forced === "memory") {
    if (isInternetFacing(env)) {
      throw new MahniStoreConfigurationError("MAHNI_STORE=memory is forbidden on Vercel preview/production.");
    }
    return "memory";
  }
  if (forced === "supabase") return "supabase";

  if (isInternetFacing(env)) {
    if (!supabaseServiceRoleConfigured(env)) {
      throw new MahniStoreConfigurationError(
        "Hosted event requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return "supabase";
  }

  if (supabaseServiceRoleConfigured(env)) return "supabase";
  if (env.NODE_ENV === "test") return "memory";
  return "memory";
}

let cached: MahniStore | null = null;

export function getMahniStore(env: EnvMap = process.env as EnvMap): MahniStore {
  if (cached) return cached;
  const backend = resolveMahniStoreBackend(env);
  cached = backend === "supabase" ? new SupabaseMahniStore() : getMemoryStore();
  return cached;
}

export function useMemoryMahniStore(store: MahniStore) {
  cached = store;
}

export function clearMahniStoreCache() {
  cached = null;
}

export { MahniStoreUnavailableError };
