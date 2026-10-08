import "server-only";

import type { ClusteringOutput } from "../validation";
import { getMahniStore } from "../store";
import { completeClusteringJson } from "./clustering";
import { createJavAuditor } from "./jav-audit";
import { runClusteringPipeline } from "./pipeline";
import { toSemanticIdeas } from "./semantic";
import { asSolComplete } from "./sol";
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
  const semantic = toSemanticIdeas(ideas);
  const backoffMs = [4_000, 8_000];
  let lastError: unknown = new Error("unknown");
  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const result = await runClusteringPipeline(semantic, { complete: asSolComplete(completeClusteringJson), jav: createJavAuditor() });
      const output: ClusteringOutput = {
        themes: result.themes.map((theme) => ({
          title: theme.title,
          description: theme.description,
          ideaIds: theme.ideaIds,
          formulationNote: theme.formulationNote,
        })),
        wildcard: result.wildcard,
      };
      await store.completeAnalysisRun(
        run.id,
        output,
        { provider: result.provider, model: result.model },
        result.themes.map((theme) => ({ reviewStatus: theme.reviewStatus, audit: theme.audit })),
      );
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
