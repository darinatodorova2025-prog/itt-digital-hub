import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminSession, requireRole } from "@/lib/auth/session";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { clientIp, handleStoreError, jsonError, jsonOk, rateLimit } from "@/mahni-dosadnoto/server/http";

async function staffEditor(): Promise<boolean> {
  try {
    return requireRole(await getAdminSession(), "editor");
  } catch {
    return false;
  }
}

const bodySchema = z.object({
  themeId: z.string().uuid(),
  ideaIds: z.array(z.string().uuid()).min(1).max(40),
});

export async function POST(request: NextRequest) {
  if (!(await staffEditor())) return jsonError("unauthorized", 401);
  if (!rateLimit(`md-extract:${clientIp(request)}`, 30, 60_000)) return jsonError("rate_limited", 429);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid", 400);
  try {
    const store = getMahniStore();
    const result = await store.extractReviewIdeas(parsed.data.themeId, parsed.data.ideaIds);
    const snapshot = await store.getPublicLiveSnapshot();
    return jsonOk({ snapshot, openedId: result.openedId });
  } catch (error) {
    return handleStoreError(error);
  }
}
