import type { NextRequest } from "next/server";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { readSessionTokenFromRequest } from "@/mahni-dosadnoto/session";
import { voteSchema } from "@/mahni-dosadnoto/validation";
import { clientIp, handleStoreError, jsonError, jsonOk, rateLimit } from "@/mahni-dosadnoto/server/http";

export async function POST(request: NextRequest) {
  const token = readSessionTokenFromRequest(request);
  if (!token) return jsonError("unauthorized", 401);
  if (!rateLimit(`md-vote:${clientIp(request)}`, 120, 60_000)) return jsonError("rate_limited", 429);
  const body = await request.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid", 400);
  try {
    const store = getMahniStore();
    const result = await store.castVote(token, parsed.data.themeId, parsed.data.idempotencyKey);
    return jsonOk({ votesUsed: result.votesUsed, votesRemaining: Math.max(0, 3 - result.votesUsed), duplicate: result.duplicate });
  } catch (error) {
    return handleStoreError(error);
  }
}
