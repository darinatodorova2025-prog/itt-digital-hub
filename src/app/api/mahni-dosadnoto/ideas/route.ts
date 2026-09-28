import type { NextRequest } from "next/server";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { readSessionTokenFromRequest } from "@/mahni-dosadnoto/session";
import { ideaSubmitSchema } from "@/mahni-dosadnoto/validation";
import { clientIp, handleStoreError, jsonError, jsonOk, rateLimit } from "@/mahni-dosadnoto/server/http";

export async function POST(request: NextRequest) {
  const token = readSessionTokenFromRequest(request);
  if (!token) return jsonError("unauthorized", 401);
  if (!rateLimit(`md-idea:${clientIp(request)}`, 60, 60_000)) return jsonError("rate_limited", 429);
  const body = await request.json().catch(() => null);
  const parsed = ideaSubmitSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid", 400);
  try {
    const store = getMahniStore();
    const result = await store.submitIdea(token, parsed.data.body, parsed.data.frequency ?? null, parsed.data.idempotencyKey);
    return jsonOk({ ideaId: result.idea.id, duplicate: result.duplicate });
  } catch (error) {
    return handleStoreError(error);
  }
}
