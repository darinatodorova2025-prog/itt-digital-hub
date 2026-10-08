import { z } from "zod";
import { createJavAuditor, javDecisionPasses, type JavAuditor } from "./jav-audit";
import type { SemanticIdea } from "./semantic";
import type { SolComplete } from "./sol";
import { synthesizeGroups, type DraftTheme } from "./synthesize";
import { VIK_EVENT_CONTEXT } from "./vik-context";

const compatibilitySchema = z.object({
  mergeable: z.boolean(),
  sharedProblem: z.preprocess((value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 280) : null;
  }, z.string().nullable()),
});

export const COMPATIBILITY_SYSTEM = `СТЪПКА СЪВМЕСТИМОСТ
Оцени дали подадените идеи имат един кратък общ проблем, верен за всяка, без ново твърдение.
При съмнение mergeable=false. Не използвай организация.
${VIK_EVENT_CONTEXT}
Върни JSON {"mergeable":false,"sharedProblem":null}.`;

export function compatibilityUserPrompt(ideas: SemanticIdea[]): string {
  return JSON.stringify({
    instruction: "Ако не си сигурен, върни mergeable false и не формулирай тема.",
    ideas: ideas.map((idea) => ({
      ideaId: idea.id,
      body: idea.body,
      role: idea.role,
      frequency: idea.frequency,
    })),
  });
}

export type CombineResult =
  | { mergeable: false }
  | { mergeable: true; title: string; description: string; formulationNote: string };

export async function combineIfCompatible(
  ideas: SemanticIdea[],
  complete: SolComplete,
  jav: JavAuditor = createJavAuditor(),
): Promise<CombineResult> {
  if (ideas.length < 2) return { mergeable: false };
  const { data } = await complete(compatibilitySchema, COMPATIBILITY_SYSTEM, compatibilityUserPrompt(ideas));
  if (!data.mergeable || !data.sharedProblem) return { mergeable: false };
  const drafts = await synthesizeGroups([{ ideaIds: ideas.map((idea) => idea.id), sharedProblem: data.sharedProblem }], ideas, complete);
  const theme: DraftTheme | undefined = drafts[0];
  if (!theme || theme.ideaIds.length !== ideas.length) return { mergeable: false };
  try {
    const decision = await jav.audit({
      contextVersion: "vik-event-2026-compact",
      title: theme.title,
      description: theme.description,
      ideas: ideas.map((idea) => ({ ideaId: idea.id, body: idea.body, role: idea.role, frequency: idea.frequency })),
    });
    if (!javDecisionPasses(decision, theme.ideaIds)) return { mergeable: false };
  } catch (error) {
    if (error instanceof Error && (error.name === "JavNotConfiguredError" || error.message === "audit_unavailable")) {
      return { mergeable: false };
    }
    throw error;
  }
  return {
    mergeable: true,
    title: theme.title,
    description: theme.description,
    formulationNote: theme.formulationNote,
  };
}
