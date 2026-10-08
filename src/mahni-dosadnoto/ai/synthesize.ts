import { z } from "zod";
import type { ConservativeGroup } from "./conservative-cluster";
import { deterministicFormulationNote, resolveFormulationNote } from "./formulation";
import type { SemanticIdea } from "./semantic";
import type { SolComplete } from "./sol";
import { VIK_EVENT_CONTEXT } from "./vik-context";

export type DraftTheme = {
  ideaIds: string[];
  title: string;
  description: string;
  formulationNote: string;
};

const synthesizedThemeSchema = z.object({
  ideaIds: z.array(z.string().min(1)).min(1),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(1200),
  formulationNote: z.string().optional(),
});

const synthesizeSchema = z.union([
  z.object({ themes: z.array(synthesizedThemeSchema) }),
  z.array(synthesizedThemeSchema).transform((themes) => ({ themes })),
]);

export const SYNTHESIZE_SYSTEM = `СТЪПКА ФОРМУЛИРОВКА
Членството на всяка група е вече фиксирано. Не мести идеи между групи.
Формулирай пресечната точка: само това, което е вярно за всяка идея в групата.
Не прави широка супертема. Не добавяй ИИ, технология, ефект, причина или решение, ако не са във всяка идея.
${VIK_EVENT_CONTEXT}
title, description и formulationNote са на български.
formulationNote е 1–3 изречения: как от пресечната точка е стигнато до заглавието и описанието.
Върни JSON {"themes":[{"ideaIds":[],"title":"","description":"","formulationNote":""}]} със същите ideaIds.`;

export const REPAIR_SYSTEM = `СТЪПКА ПОПРАВКА
Тези групи не издържаха проверката. Раздели ги консервативно.
Не обединявай насила. Ако едно кратко твърдение не е вярно за всяка идея, certain=false.
Няма целеви брой. Върни JSON {"groups":[{"ideaIds":[],"sharedProblem":null,"certain":false}]} само за подадените идеи.
Всяка подадена идея точно веднъж.`;

function clip(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function fallbackTheme(group: ConservativeGroup, ideas: SemanticIdea[]): DraftTheme {
  const byId = new Map(ideas.map((idea) => [idea.id, idea]));
  const sources = group.ideaIds.map((id) => ({ body: byId.get(id)?.body ?? "" }));
  const base = group.sharedProblem?.trim() || sources.find((source) => source.body.trim().length > 0)?.body || "Отделна тема";
  const title = clip(base, 90);
  const description = clip(base, 400);
  const safeDescription = description.length >= 10 ? description : `${title}. Формулирано от подадените идеи.`;
  return {
    ideaIds: group.ideaIds,
    title: title.length >= 3 ? title : "Отделна тема",
    description: safeDescription.slice(0, 1200),
    formulationNote: resolveFormulationNote(null, {
      title,
      description: safeDescription,
      isAiWildcard: false,
      sources,
    }),
  };
}

function sameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const wanted = new Set(right);
  return left.every((id) => wanted.has(id));
}

export function themesFromModel(groups: ConservativeGroup[], ideas: SemanticIdea[], modelThemes: DraftTheme[]): DraftTheme[] {
  return groups.map((group) => {
    const match = modelThemes.find((theme) => sameMembers(theme.ideaIds, group.ideaIds));
    if (!match) return fallbackTheme(group, ideas);
    const sources = group.ideaIds.map((id) => ({ body: ideas.find((idea) => idea.id === id)?.body ?? "" }));
    return {
      ideaIds: group.ideaIds,
      title: match.title,
      description: match.description,
      formulationNote: resolveFormulationNote(match.formulationNote, {
        title: match.title,
        description: match.description,
        isAiWildcard: false,
        sources,
      }),
    };
  });
}

export function synthesizeUserPrompt(groups: ConservativeGroup[], ideas: SemanticIdea[]): string {
  const byId = new Map(ideas.map((idea) => [idea.id, idea]));
  return JSON.stringify({
    instruction: "Формулирай само пресечната точка на вече фиксираните групи.",
    groups: groups.map((group) => ({
      ideaIds: group.ideaIds,
      sharedProblem: group.sharedProblem,
      ideas: group.ideaIds.map((id) => {
        const idea = byId.get(id);
        return { ideaId: id, body: idea?.body ?? "", role: idea?.role ?? "", frequency: idea?.frequency ?? null };
      }),
    })),
  });
}

export function repairUserPrompt(groups: ConservativeGroup[], ideas: SemanticIdea[], reasonCodes: string[]): string {
  const byId = new Map(ideas.map((idea) => [idea.id, idea]));
  return JSON.stringify({
    instruction: "Раздели консервативно. Не обединявай насила.",
    reasonCodes,
    groups: groups.map((group) => ({
      ideaIds: group.ideaIds,
      ideas: group.ideaIds.map((id) => {
        const idea = byId.get(id);
        return { ideaId: id, body: idea?.body ?? "", role: idea?.role ?? "", frequency: idea?.frequency ?? null };
      }),
    })),
  });
}

const SYNTHESIZE_BATCH = 8;

export async function synthesizeGroups(groups: ConservativeGroup[], ideas: SemanticIdea[], complete: SolComplete): Promise<DraftTheme[]> {
  if (groups.length === 0) return [];
  const drafts: DraftTheme[] = [];
  for (let index = 0; index < groups.length; index += SYNTHESIZE_BATCH) {
    const slice = groups.slice(index, index + SYNTHESIZE_BATCH);
    try {
      const { data } = await complete(synthesizeSchema, SYNTHESIZE_SYSTEM, synthesizeUserPrompt(slice, ideas));
      drafts.push(
        ...themesFromModel(
          slice,
          ideas,
          data.themes.map((theme) => ({ ...theme, formulationNote: theme.formulationNote ?? "" })),
        ),
      );
    } catch {
      drafts.push(...slice.map((group) => fallbackTheme(group, ideas)));
    }
  }
  return drafts;
}

export function wildcardTheme(): { title: string; description: string; formulationNote: string } {
  const title = "Допълнително предложение";
  const description = "Отделно предложение извън подадените идеи, без обединяване на участнически текстове.";
  return {
    title,
    description,
    formulationNote: deterministicFormulationNote({
      title,
      description,
      isAiWildcard: true,
      sources: [],
    }),
  };
}
