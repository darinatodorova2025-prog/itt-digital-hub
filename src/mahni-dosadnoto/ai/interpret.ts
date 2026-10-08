import { z } from "zod";
import type { SemanticIdea } from "./semantic";
import type { SolComplete } from "./sol";
import { VIK_EVENT_CONTEXT, VIK_EVENT_CONTEXT_VERSION } from "./vik-context";

export type IdeaFingerprint = {
  ideaId: string;
  actorType: string | null;
  workflowStage: string | null;
  task: string | null;
  object: string | null;
  pain: string | null;
  cause: string | null;
  desiredOutcome: string | null;
  explicitSolution: string | null;
  frequency: string | null;
  domainTags: string[];
};

const looseText = z.preprocess((value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 240) : null;
}, z.string().nullable());

const interpretIdeaSchema = z
  .object({
    ideaId: z.string().min(1),
    actorType: looseText.optional(),
    role: looseText.optional(),
    workflowStage: looseText.optional(),
    task: looseText.optional(),
    object: looseText.optional(),
    pain: looseText.optional(),
    problem: looseText.optional(),
    cause: looseText.optional(),
    desiredOutcome: looseText.optional(),
    explicitSolution: looseText.optional(),
    solution: looseText.optional(),
    frequency: looseText.optional(),
    domainTags: z.array(z.string()).optional(),
  })
  .transform((value) => ({
    ideaId: value.ideaId,
    actorType: value.actorType ?? value.role ?? null,
    workflowStage: value.workflowStage ?? null,
    task: value.task ?? null,
    object: value.object ?? null,
    pain: value.pain ?? value.problem ?? null,
    cause: value.cause ?? null,
    desiredOutcome: value.desiredOutcome ?? null,
    explicitSolution: value.explicitSolution ?? value.solution ?? null,
    frequency: value.frequency ?? null,
    domainTags: (value.domainTags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0).slice(0, 8),
  }));

const interpretSchema = z.union([
  z.object({ ideas: z.array(interpretIdeaSchema) }),
  z.array(interpretIdeaSchema).transform((ideas) => ({ ideas })),
]);

export const INTERPRET_SYSTEM = `СТЪПКА ИНТЕРПРЕТАЦИЯ
Интерпретираш всяка идея ОТДЕЛНО за българска ВиК конференция.
Не групирай идеи. Не сравнявай организации. Организация не е подадена и не е сигнал.
${VIK_EVENT_CONTEXT}
Липсващото поле е null. Не попълвай причина, желаен резултат или решение, ако текстът не ги казва.
Запази двусмислието. Честотата копирай от входа, не я претегляй.
Върни JSON с ключове ideaId, actorType, workflowStage, task, object, pain, cause, desiredOutcome, explicitSolution, frequency, domainTags.
Проблемът е в pain. Не използвай друго име за него. Липсващото е null.`;

export function interpretUserPrompt(ideas: SemanticIdea[]): string {
  return JSON.stringify({
    contextVersion: VIK_EVENT_CONTEXT_VERSION,
    instruction: "Интерпретирай всяка идея самостоятелно. Не връщай групи.",
    ideas: ideas.map((idea) => ({
      ideaId: idea.id,
      body: idea.body,
      role: idea.role,
      frequency: idea.frequency,
    })),
  });
}

export function reconcileFingerprints(ideas: SemanticIdea[], returned: IdeaFingerprint[]): IdeaFingerprint[] {
  const byId = new Map(returned.map((item) => [item.ideaId, item]));
  return ideas.map((idea) => {
    const found = byId.get(idea.id);
    if (!found) {
      return {
        ideaId: idea.id,
        actorType: null,
        workflowStage: null,
        task: null,
        object: null,
        pain: null,
        cause: null,
        desiredOutcome: null,
        explicitSolution: null,
        frequency: idea.frequency,
        domainTags: [],
      };
    }
    return { ...found, frequency: found.frequency ?? idea.frequency };
  });
}

const INTERPRET_BATCH = 8;

export async function interpretIdeas(
  ideas: SemanticIdea[],
  complete: SolComplete,
): Promise<{ fingerprints: IdeaFingerprint[]; provider: string; model: string }> {
  const returned: IdeaFingerprint[] = [];
  let provider = "openai";
  let model = "gpt-6.1-sol";
  for (let index = 0; index < ideas.length; index += INTERPRET_BATCH) {
    const slice = ideas.slice(index, index + INTERPRET_BATCH);
    const result = await complete(interpretSchema, INTERPRET_SYSTEM, interpretUserPrompt(slice));
    provider = result.provider;
    model = result.model;
    returned.push(...result.data.ideas);
  }
  return { fingerprints: reconcileFingerprints(ideas, returned), provider, model };
}
