import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MahniStoreConfigurationError, MahniStoreUnavailableError } from "@/mahni-dosadnoto/store";

export function jsonOk<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function jsonError(code: string, status = 400) {
  return NextResponse.json({ ok: false, error: code }, { status });
}

export function handleStoreError(error: unknown) {
  if (error instanceof MahniStoreUnavailableError || error instanceof MahniStoreConfigurationError) {
    return jsonError("store_unavailable", 503);
  }
  const message = error instanceof Error ? error.message : "failed";
  if (message === "not_collecting") return jsonError("not_collecting", 409);
  if (message === "not_voting" || message === "vote_limit") return jsonError(message, 409);
  if (message === "unauthorized") return jsonError("unauthorized", 401);
  if (message === "invalid_theme") return jsonError("invalid_theme", 400);
  if (message === "not_analyzing") return jsonError("not_analyzing", 409);
  return jsonError("failed", 500);
}

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const row = buckets.get(key);
  if (!row || row.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (row.count >= limit) return false;
  row.count += 1;
  return true;
}
