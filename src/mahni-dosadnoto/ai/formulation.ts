import type { Theme, ThemeSourceIdea } from "../types";

export function acceptedFormulationNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 10) return null;
  return trimmed.slice(0, 800);
}

function clip(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Note built only from the title, description, and idea texts that were actually grouped.
 */
export function deterministicFormulationNote(input: {
  title: string;
  description: string;
  isAiWildcard: boolean;
  sources: Array<{ body: string }>;
}): string {
  const title = input.title.trim() || "Тема";
  const description = input.description.trim();
  if (input.isAiWildcard) {
    const wording = description || title;
    return clip(
      `Допълнително предложение извън подадените идеи. Заглавието „${title}“ е формулирано така: ${wording}.`,
      800,
    );
  }
  if (input.sources.length === 0) {
    return clip(
      `Комбинираната формулировка „${title}“ няма записани подадени идеи. Описанието е: ${description || title}.`,
      800,
    );
  }
  const quotes = input.sources
    .map((source) => source.body.trim())
    .filter((body) => body.length > 0)
    .map((body) => `„${clip(body, 160)}“`);
  if (quotes.length === 0) {
    return clip(
      `Комбинираната формулировка „${title}“ сочи към ${input.sources.length} подадени идеи, но оригиналният им текст липсва в записа.`,
      800,
    );
  }
  return clip(
    `Комбинираната формулировка „${title}“ обобщава ${input.sources.length} подадени идеи: ${quotes.join("; ")}.`,
    800,
  );
}

export function resolveFormulationNote(
  modelNote: unknown,
  input: {
    title: string;
    description: string;
    isAiWildcard: boolean;
    sources: Array<{ body: string }>;
  },
): string {
  return acceptedFormulationNote(modelNote) ?? deterministicFormulationNote(input);
}

export function themeSourcesFromIdeas(
  ideaIds: string[],
  ideas: Array<{ id: string; body: string }>,
): ThemeSourceIdea[] {
  const byId = new Map(ideas.map((idea) => [idea.id, idea.body]));
  return ideaIds.map((id) => ({ id, body: byId.get(id) ?? "" }));
}

export function parseSourceIdeas(value: unknown): ThemeSourceIdea[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const sources: ThemeSourceIdea[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; body?: unknown };
    if (typeof row.id !== "string" || typeof row.body !== "string") continue;
    const id = row.id.trim();
    if (!id) continue;
    sources.push({ id, body: row.body });
  }
  return sources;
}

export function hydrateThemeTrace(theme: Theme, linkedIdeas: ThemeSourceIdea[]): Theme {
  const stored = theme.sourceIdeas ?? [];
  const sources = stored.length > 0 ? stored : linkedIdeas;
  return {
    ...theme,
    sourceIdeas: sources,
    formulationNote: resolveFormulationNote(theme.formulationNote, {
      title: theme.title,
      description: theme.description,
      isAiWildcard: theme.isAiWildcard,
      sources,
    }),
  };
}

export function clusteringCommitTheme(
  theme: { title: string; description: string; ideaIds: string[]; formulationNote?: string | null },
  ideas: Array<{ id: string; body: string }>,
) {
  const sourceIdeas = themeSourcesFromIdeas(theme.ideaIds, ideas);
  return {
    title: theme.title,
    description: theme.description,
    ideaIds: theme.ideaIds,
    sourceIdeas,
    formulationNote: resolveFormulationNote(theme.formulationNote, {
      title: theme.title,
      description: theme.description,
      isAiWildcard: false,
      sources: sourceIdeas,
    }),
  };
}

export function clusteringCommitWildcard(wildcard: {
  title: string;
  description: string;
  formulationNote?: string | null;
}) {
  return {
    title: wildcard.title,
    description: wildcard.description,
    formulationNote: resolveFormulationNote(wildcard.formulationNote, {
      title: wildcard.title,
      description: wildcard.description,
      isAiWildcard: true,
      sources: [],
    }),
  };
}
