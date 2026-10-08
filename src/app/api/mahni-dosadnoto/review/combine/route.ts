import type { NextRequest } from "next/server";
import { z } from "zod";
import { combineSelection, type CombineGroup } from "@/mahni-dosadnoto/ai/combine-selection";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { clientIp, handleStoreError, jsonError, jsonOk, rateLimit } from "@/mahni-dosadnoto/server/http";

const groupSchema = z.object({
  title: z.string().trim().min(1).max(500),
  rawIdeas: z.array(z.string().trim().min(1).max(500)).max(40),
});

const bodySchema = z.object({
  preview: z.boolean().optional(),
  themeIds: z.array(z.string().uuid()).min(2).max(20).optional(),
  groups: z.array(groupSchema).min(2).max(20).optional(),
});

export async function POST(request: NextRequest) {
  if (!rateLimit(`md-combine:${clientIp(request)}`, 8, 60_000)) return jsonError("rate_limited", 429);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid", 400);

  if (parsed.data.preview) {
    if (process.env.NODE_ENV === "production" || !parsed.data.groups) return jsonError("invalid", 400);
    try {
      const result = await combineSelection(parsed.data.groups satisfies CombineGroup[]);
      return jsonOk({ result });
    } catch {
      return jsonError("failed", 502);
    }
  }

  if (!parsed.data.themeIds) return jsonError("invalid", 400);
  try {
    const store = getMahniStore();
    const themes = await store.listThemes();
    const selected = parsed.data.themeIds.map((id) => themes.find((theme) => theme.id === id));
    if (selected.some((theme) => !theme)) return jsonError("invalid_theme", 400);
    const groups: CombineGroup[] = selected.map((theme) => ({
      title: theme!.title,
      rawIdeas: (theme!.sourceIdeas ?? []).map((source) => source.body),
    }));
    const result = await combineSelection(groups);
    const merged = await store.mergeReviewThemes(parsed.data.themeIds, result);
    const snapshot = await store.getPublicLiveSnapshot();
    return jsonOk({ snapshot, openedId: merged.openedId });
  } catch (error) {
    if (error instanceof Error && (error.message === "not_analyzing" || error.message === "invalid_theme")) {
      return handleStoreError(error);
    }
    return jsonError("failed", 502);
  }
}
