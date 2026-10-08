import { deterministicFormulationNote } from "./ai/formulation";
import { publicExcerpt } from "./public-excerpt";
import type { Theme, ThemeReviewStatus, ThemeSourceIdea } from "./types";

export type LiveReviewSource = { id: string; body: string };

export type LiveReviewItem = {
  id: string;
  title: string;
  description: string;
  formulationNote: string;
  isAiWildcard: boolean;
  sources: LiveReviewSource[];
};

export type PublicReviewCard = {
  id: string;
  title: string;
  description: string;
  ideaCount: number;
  organizationCount: number;
  mapping: string;
  excerpts: string[];
  question: string;
};

export const AUDIENCE_QUESTION = "Това представя ли правилно тези идеи?";

export function reviewMapping(ideaCount: number): string {
  if (ideaCount <= 1) return "1 идея → 1 тема";
  return `${ideaCount} идеи → 1 обща тема`;
}

export function toPublicReviewCard(
  theme: Pick<Theme, "id" | "title" | "description" | "ideaCount" | "organizationCount" | "sourceIdeas">,
  organizations: Map<string, string> = new Map(),
): PublicReviewCard {
  const sources = theme.sourceIdeas ?? [];
  return {
    id: theme.id,
    title: publicExcerpt(theme.title, { max: 200 }),
    description: publicExcerpt(theme.description, { max: 400 }),
    ideaCount: theme.ideaCount || sources.length,
    organizationCount: theme.organizationCount,
    mapping: reviewMapping(theme.ideaCount || sources.length),
    excerpts: sources.slice(0, 3).map((source) => publicExcerpt(source.body, { organization: organizations.get(source.id), max: 180 })),
    question: AUDIENCE_QUESTION,
  };
}

export function currentPublicReview(themes: Theme[], ideas: Array<{ id: string; organization: string }> = []): PublicReviewCard | null {
  const organizations = new Map(ideas.map((idea) => [idea.id, idea.organization]));
  const current = themes.find((theme) => !theme.isAiWildcard && theme.reviewStatus === "review_ready");
  return current ? toPublicReviewCard(current, organizations) : null;
}

export type ReviewSource = LiveReviewSource & { organization: string };

export type ReviewDraft = {
  id: string;
  analysisRunId: string;
  title: string;
  description: string;
  formulationNote: string;
  isAiWildcard: boolean;
  sortOrder: number;
  sources: ReviewSource[];
  reviewStatus: ThemeReviewStatus;
};

export function extractButtonLabel(count: number): string {
  return count > 1 ? "Извади идеите" : "Извади идеята";
}

export function combineButtonEnabled(count: number): boolean {
  return count > 1;
}

export function toLiveReviewItem(theme: Theme): LiveReviewItem {
  return {
    id: theme.id,
    title: theme.title,
    description: theme.description,
    formulationNote: theme.formulationNote?.trim() || "",
    isAiWildcard: theme.isAiWildcard,
    sources: (theme.sourceIdeas ?? []).map((source) => ({ id: source.id, body: source.body })),
  };
}

export function draftsFromThemes(
  themes: Theme[],
  ideas: Array<{ id: string; body: string; organization: string }>,
): ReviewDraft[] {
  const ideaById = new Map(ideas.map((idea) => [idea.id, idea]));
  return themes.map((theme) => ({
    id: theme.id,
    analysisRunId: theme.analysisRunId,
    title: theme.title,
    description: theme.description,
    formulationNote: theme.formulationNote?.trim() || "",
    isAiWildcard: theme.isAiWildcard,
    sortOrder: theme.sortOrder,
    sources: (theme.sourceIdeas ?? []).map((source) => sourceWithOrganization(source, ideaById.get(source.id)?.organization ?? "")),
    reviewStatus: theme.reviewStatus ?? "review_ready",
  }));
}

function sourceWithOrganization(source: ThemeSourceIdea, organization: string): ReviewSource {
  return { id: source.id, body: source.body, organization };
}

function renumber(themes: ReviewDraft[]): ReviewDraft[] {
  return themes.map((theme, index) => ({ ...theme, sortOrder: index }));
}

export function extractSources(
  themes: ReviewDraft[],
  themeId: string,
  ideaIds: string[],
  newIds: string[],
): { themes: ReviewDraft[]; openedId: string; createdIds: string[] } {
  const uniqueIds = [...new Set(ideaIds)];
  if (uniqueIds.length === 0 || newIds.length < uniqueIds.length) throw new Error("invalid_theme");
  const index = themes.findIndex((theme) => theme.id === themeId);
  const parent = index >= 0 ? themes[index] : undefined;
  if (!parent) throw new Error("invalid_theme");
  const sourceById = new Map(parent.sources.map((source) => [source.id, source]));
  const pulled: ReviewSource[] = [];
  for (const id of uniqueIds) {
    const source = sourceById.get(id);
    if (!source) throw new Error("invalid_theme");
    pulled.push(source);
  }
  const remaining = parent.sources.filter((source) => !uniqueIds.includes(source.id));
  const created: ReviewDraft[] = pulled.map((source, offset) => {
    const text = source.body.trim() || parent.title;
    return {
      id: newIds[offset]!,
      analysisRunId: parent.analysisRunId,
      title: text,
      description: text,
      formulationNote: `Извадена от „${parent.title}“. Показан е оригиналният текст, без нова формулировка.`,
      isAiWildcard: false,
      reviewStatus: "review_ready",
      sortOrder: parent.sortOrder,
      sources: [source],
    };
  });
  const next = [...themes];
  if (remaining.length === 0) {
    next.splice(index, 1, ...created);
  } else {
    const previous = parent.formulationNote.trim();
    next[index] = {
      ...parent,
      isAiWildcard: false,
      reviewStatus: "review_ready",
      sources: remaining,
      formulationNote: `След изваждане остават ${remaining.length} идеи. Предишната формулировка беше: ${previous || parent.title}`.slice(0, 800),
    };
    next.splice(index + 1, 0, ...created);
  }
  const openedId = remaining.length === 0 ? created[0]!.id : parent.id;
  return { themes: renumber(next), openedId, createdIds: created.map((theme) => theme.id) };
}

export function mergeDrafts(
  themes: ReviewDraft[],
  themeIds: string[],
  result: { title: string; description: string; formulationNote: string | null },
  newId: string,
): { themes: ReviewDraft[]; openedId: string } {
  const uniqueIds = [...new Set(themeIds)];
  if (uniqueIds.length < 2) throw new Error("invalid_theme");
  const selected = uniqueIds.map((id) => themes.find((theme) => theme.id === id));
  if (selected.some((theme) => !theme)) throw new Error("invalid_theme");
  const picked = selected as ReviewDraft[];
  const seen = new Set<string>();
  const sources: ReviewSource[] = [];
  for (const theme of picked) {
    for (const source of theme.sources) {
      if (seen.has(source.id)) continue;
      seen.add(source.id);
      sources.push(source);
    }
  }
  const earliest = Math.min(...picked.map((theme) => themes.findIndex((themeRow) => themeRow.id === theme.id)));
  const formulationNote =
    result.formulationNote?.trim() ||
    deterministicFormulationNote({
      title: result.title,
      description: result.description,
      isAiWildcard: sources.length === 0,
      sources,
    });
  const merged: ReviewDraft = {
    id: newId,
    analysisRunId: picked[0]!.analysisRunId,
    title: result.title.trim(),
    description: result.description.trim(),
    formulationNote,
    isAiWildcard: sources.length === 0,
    reviewStatus: "review_ready",
    sortOrder: picked[0]!.sortOrder,
    sources,
  };
  const drop = new Set(uniqueIds);
  const next = themes.filter((theme) => !drop.has(theme.id));
  next.splice(Math.min(earliest, next.length), 0, merged);
  return { themes: renumber(next), openedId: newId };
}
