import "server-only";

import type { Idea } from "../types";
import { clusteringOutputSchemaFor, validateClusteringAgainstIdeas } from "../validation";
import { getMahniStore } from "../store";
import { completeClusteringJson } from "./clustering";
import { CLUSTERING_SYSTEM, clusteringUserPrompt } from "./prompts";
import { isTransientAiError } from "./transient-errors";
import { runJuryWithResilience, type RunJuryResult } from "./jury-execution";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runClusteringAnalysis(): Promise<void> {
  const store = getMahniStore();
  const campaign = await store.ensureCampaign();
  const ideas = (await store.listIdeasAdmin()).filter((i) => i.campaignId === campaign.id);
  if (ideas.length === 0) throw new Error("no_ideas");
  const run = await store.startAnalysisRun();
  const payload = ideas.map((i: Idea) => ({ id: i.id, body: i.body, organization: i.organization }));
  const schema = clusteringOutputSchemaFor(ideas.length);
  const backoffMs = [4_000, 8_000];
  let lastError: unknown = new Error("unknown");
  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const { data, provider, model } = await completeClusteringJson(schema, CLUSTERING_SYSTEM, clusteringUserPrompt(payload));
      const valid = validateClusteringAgainstIdeas(data, new Set(ideas.map((i) => i.id)));
      if (!valid.ok) throw new Error(valid.reason);
      await store.completeAnalysisRun(run.id, data, { provider, model });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < backoffMs.length && isTransientAiError(error)) {
        await sleep(backoffMs[attempt]!);
        continue;
      }
      break;
    }
  }
  const message = lastError instanceof Error ? lastError.message : "unknown";
  await store.failAnalysisRun(run.id, "cluster_failed", message);
  throw lastError instanceof Error ? lastError : new Error(message);
}

export async function runFullJury(): Promise<RunJuryResult> {
  const store = getMahniStore();
  return runJuryWithResilience(store);
}
