import "server-only";

import type { Idea } from "../types";
import { clusteringOutputSchema, validateClusteringAgainstIdeas } from "../validation";
import { getMahniStore } from "../store";
import { completeJson } from "./provider";
import { CLUSTERING_SYSTEM, clusteringUserPrompt } from "./prompts";
import { runJuryWithResilience, type RunJuryResult } from "./jury-execution";

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

export async function runFullJury(): Promise<RunJuryResult> {
  const store = getMahniStore();
  return runJuryWithResilience(store);
}
