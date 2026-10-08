import { z } from "zod";
import type { IdeaFingerprint } from "./interpret";
import type { SemanticIdea } from "./semantic";
import type { SolComplete } from "./sol";
import { VIK_EVENT_CONTEXT, VIK_EVENT_CONTEXT_VERSION } from "./vik-context";

export type ProposedGroup = {
  ideaIds: string[];
  sharedProblem: string | null;
  certain: boolean;
};

export type ConservativeGroup = {
  ideaIds: string[];
  sharedProblem: string | null;
};

const looseText = z.preprocess((value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 280) : null;
}, z.string().nullable());

const clusterGroupSchema = z.object({
  ideaIds: z.array(z.string().min(1)).min(1),
  sharedProblem: looseText,
  certain: z.boolean().optional(),
});

const clusterSchema = z.union([
  z.object({ groups: z.array(clusterGroupSchema) }),
  z.array(clusterGroupSchema).transform((groups) => ({ groups })),
]);

export const CLUSTER_SYSTEM = `СТЪПКА КЛЪСТЕР
Групирай консервативно вече интерпретирани идеи.
Обедини само когато ЕДНО кратко описание на проблема е вярно за всяка идея в групата, без да добавяш ново твърдение.
При съмнение certain=false. Грешното обединяване е по-лошо от грешното разделяне.
Няма целеви брой теми. Не се стреми към 8, 12 или друг фиксиран брой.
Еднакъв сектор, работен поток, софтуер, документ или роля не са един и същ проблем.
Не използвай име на организация.
${VIK_EVENT_CONTEXT}
Върни JSON {"groups":[{"ideaIds":[],"sharedProblem":null,"certain":false}]}.
Всяка подадена идея влиза точно веднъж.`;

export function clusterUserPrompt(ideas: SemanticIdea[], fingerprints: IdeaFingerprint[]): string {
  const byId = new Map(ideas.map((idea) => [idea.id, idea]));
  return JSON.stringify({
    contextVersion: VIK_EVENT_CONTEXT_VERSION,
    instruction: "Няма целеви брой. Обединявай само при сигурен общ проблем.",
    ideas: fingerprints.map((fingerprint) => {
      const idea = byId.get(fingerprint.ideaId);
      return {
        ideaId: fingerprint.ideaId,
        body: idea?.body ?? "",
        role: idea?.role ?? "",
        frequency: idea?.frequency ?? fingerprint.frequency,
        fingerprint,
      };
    }),
  });
}

function painKey(pain: string | null): string | null {
  if (!pain) return null;
  const key = pain.trim().toLocaleLowerCase("bg-BG").replace(/\s+/g, " ");
  return key.length >= 3 ? key : null;
}

/**
 * Uncertainty stays separate: a group without certainty, without one shared problem,
 * or with a missing pain is not merged.
 * A certain group whose every idea has a pain is kept. Paraphrased pains are not treated
 * as a contradiction; JAV audits that judgment.
 */
export function enforceConservativeGroups(fingerprints: IdeaFingerprint[], proposed: ProposedGroup[]): ConservativeGroup[] {
  const known = new Map(fingerprints.map((item) => [item.ideaId, item]));
  const assigned = new Set<string>();
  const groups: ConservativeGroup[] = [];

  const take = (ids: string[], sharedProblem: string | null) => {
    const unique = [...new Set(ids)].filter((id) => known.has(id) && !assigned.has(id));
    if (unique.length === 0) return;
    for (const id of unique) assigned.add(id);
    groups.push({ ideaIds: unique, sharedProblem: unique.length > 1 ? sharedProblem : null });
  };

  for (const group of proposed) {
    const shared = group.sharedProblem?.trim() || null;
    if (!group.certain || !shared) {
      for (const id of group.ideaIds) take([id], null);
      continue;
    }
    const grounded: string[] = [];
    const loose: string[] = [];
    for (const id of group.ideaIds) {
      if (painKey(known.get(id)?.pain ?? null)) grounded.push(id);
      else loose.push(id);
    }
    if (grounded.length > 1) take(grounded, shared);
    else for (const id of grounded) take([id], null);
    for (const id of loose) take([id], null);
  }

  for (const fingerprint of fingerprints) {
    if (!assigned.has(fingerprint.ideaId)) groups.push({ ideaIds: [fingerprint.ideaId], sharedProblem: null });
  }
  return groups;
}

export async function proposeClusters(
  ideas: SemanticIdea[],
  fingerprints: IdeaFingerprint[],
  complete: SolComplete,
  system = CLUSTER_SYSTEM,
  user = clusterUserPrompt(ideas, fingerprints),
): Promise<ProposedGroup[]> {
  const { data } = await complete(clusterSchema, system, user);
  return data.groups.map((group) => ({
    ideaIds: group.ideaIds,
    sharedProblem: group.sharedProblem,
    certain: group.certain === true,
  }));
}
