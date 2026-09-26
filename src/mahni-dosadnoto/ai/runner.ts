import "server-only";

import type { Idea } from "../types";
import type { JudgeType } from "../types";
import { clusteringOutputSchema, juryOutputSchema, validateClusteringAgainstIdeas } from "../validation";
import { getMahniStore } from "../store";
import { completeJson } from "./provider";
import { CLUSTERING_SYSTEM, clusteringUserPrompt, JUDGE_PROMPTS, juryUserPrompt } from "./prompts";

export async function runClusteringAnalysis(): Promise<void> {
  const store = getMahniStore();
  const campaign = await store.ensureCampaign();
  const ideas = (await store.listIdeasAdmin()).filter((i) => i.campaignId === campaign.id);
  if (ideas.length === 0) throw new Error("no_ideas");
  const run = await store.startAnalysisRun();
  try {
    const payload = ideas.map((i: Idea) => ({ id: i.id, body: i.body, organization: i.organization }));
    const { data, provider, model } = await completeJson(clusteringOutputSchema, CLUSTERING_SYSTEM, clusteringUserPrompt(payload));
    const valid = validateClusteringAgainstIdeas(data, new Set(ideas.map((i) => i.id)));
    if (!valid.ok) throw new Error(valid.reason);
    await store.completeAnalysisRun(run.id, data, { provider, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    await store.failAnalysisRun(run.id, "cluster_failed", message);
    throw error;
  }
}

export async function runJuryJudge(judge: JudgeType): Promise<void> {
  const store = getMahniStore();
  const themes = await store.listThemes();
  const run = await store.startJuryRun(judge);
  try {
    const { data, provider, model } = await completeJson(
      juryOutputSchema,
      JUDGE_PROMPTS[judge],
      juryUserPrompt(themes.map((t) => ({ id: t.id, title: t.title, description: t.description, isAiWildcard: t.isAiWildcard }))),
    );
    await store.completeJuryRun(run.id, data, { provider, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    await store.failJuryRun(run.id, "jury_failed", message);
    throw error;
  }
}

export async function runFullJury(): Promise<void> {
  const judges: JudgeType[] = ["business_value", "feasibility", "innovation"];
  for (const judge of judges) {
    await runJuryJudge(judge);
  }
}
