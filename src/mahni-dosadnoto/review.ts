import { deterministicFormulationNote } from "./ai/formulation";
import type { Theme, ThemeSourceIdea } from "./types";

export type LiveReviewSource = { id: string; body: string };

export type LiveReviewItem = {
  id: string;
  title: string;
  description: string;
  formulationNote: string;
  isAiWildcard: boolean;
  sources: LiveReviewSource[];
};

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
    sortOrder: picked[0]!.sortOrder,
    sources,
  };
  const drop = new Set(uniqueIds);
  const next = themes.filter((theme) => !drop.has(theme.id));
  next.splice(Math.min(earliest, next.length), 0, merged);
  return { themes: renumber(next), openedId: newId };
}
