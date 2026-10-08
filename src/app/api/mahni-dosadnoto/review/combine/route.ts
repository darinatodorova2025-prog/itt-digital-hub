import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminSession, requireRole } from "@/lib/auth/session";
import { combineIfCompatible } from "@/mahni-dosadnoto/ai/combine-selection";
import { completeClusteringJson } from "@/mahni-dosadnoto/ai/clustering";
import { asSolComplete } from "@/mahni-dosadnoto/ai/sol";
import type { SemanticIdea } from "@/mahni-dosadnoto/ai/semantic";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { clientIp, handleStoreError, jsonError, jsonOk, rateLimit } from "@/mahni-dosadnoto/server/http";

async function staffEditor(): Promise<boolean> {
  try {
    return requireRole(await getAdminSession(), "editor");
  } catch {
    return false;
  }
}

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
  if (!(await staffEditor())) return jsonError("unauthorized", 401);
  if (!rateLimit(`md-combine:${clientIp(request)}`, 8, 60_000)) return jsonError("rate_limited", 429);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid", 400);

  if (parsed.data.preview) {
    if (process.env.NODE_ENV === "production" || !parsed.data.groups) return jsonError("invalid", 400);
    const ideas: SemanticIdea[] = parsed.data.groups.flatMap((group) =>
      (group.rawIdeas.length > 0 ? group.rawIdeas : [group.title]).map((text, index) => ({
        id: `${group.title}-${index}`,
        body: text,
        role: "",
        frequency: null,
      })),
    );
    try {
      const result = await combineIfCompatible(ideas, asSolComplete(completeClusteringJson));
      return jsonOk({ result });
    } catch {
      return jsonError("failed", 502);
    }
  }

  if (!parsed.data.themeIds) return jsonError("invalid", 400);
  try {
    const store = getMahniStore();
    const [themes, ideas] = await Promise.all([store.listThemes(), store.listIdeasAdmin()]);
    const selected = parsed.data.themeIds.map((id) => themes.find((theme) => theme.id === id));
    if (selected.some((theme) => !theme)) return jsonError("invalid_theme", 400);
    const byId = new Map(ideas.map((idea) => [idea.id, idea]));
    const semantic: SemanticIdea[] = selected.flatMap((theme) =>
      (theme?.sourceIdeas ?? []).map((source) => {
        const idea = byId.get(source.id);
        return { id: source.id, body: source.body, role: idea?.role ?? "", frequency: idea?.frequency ?? null };
      }),
    );
    const result = await combineIfCompatible(semantic, asSolComplete(completeClusteringJson));
    if (!result.mergeable) return jsonOk({ mergeable: false });
    const merged = await store.mergeReviewThemes(parsed.data.themeIds, result);
    const snapshot = await store.getPublicLiveSnapshot();
    return jsonOk({ snapshot, openedId: merged.openedId, mergeable: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "not_analyzing" || error.message === "invalid_theme")) {
      return handleStoreError(error);
    }
    return jsonError("failed", 502);
  }
}
