import "server-only";

import { AiActProviderError } from "@/lib/ai-act/errors";
import type { JudgeType } from "../types";
import { JUDGE_TYPES } from "../types";
import { juryOutputSchema } from "../validation";
import type { MahniStore } from "../store/types";
import { summarizeJuryProgress } from "../jury-status";
import { completeJsonWithRetry } from "./provider";
import { JUDGE_PROMPTS, juryUserPrompt } from "./prompts";
import { isTransientAiError } from "./transient-errors";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function latestRunForJudge(store: MahniStore, judge: JudgeType) {
  const runs = await store.listJuryResults();
  return runs.find((r) => r.judgeType === judge) ?? null;
}

export type RunJuryOptions = {
  judges?: JudgeType[];
};

export type RunJuryResult = {
  progress: ReturnType<typeof summarizeJuryProgress>;
  attempted: JudgeType[];
  skippedSucceeded: JudgeType[];
};

export async function runJuryWithResilience(store: MahniStore, options: RunJuryOptions = {}): Promise<RunJuryResult> {
  const themes = await store.listThemes();
  const themePayload = themes.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    isAiWildcard: t.isAiWildcard,
  }));

  const targetJudges = options.judges ?? [...JUDGE_TYPES];
  const attempted: JudgeType[] = [];
  const skippedSucceeded: JudgeType[] = [];

  for (const judge of JUDGE_TYPES) {
    if (!targetJudges.includes(judge)) continue;

    const existing = await latestRunForJudge(store, judge);
    if (existing?.status === "succeeded") {
      skippedSucceeded.push(judge);
      continue;
    }
    if (existing?.status === "running") {
      continue;
    }

    attempted.push(judge);
    const run = await store.startJuryRun(judge);
    const backoffMs = [2_000, 5_000, 10_000];
    let lastError: unknown;

    for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
      try {
        const { data, provider, model } = await completeJsonWithRetry(
          juryOutputSchema,
          JUDGE_PROMPTS[judge],
          juryUserPrompt(themePayload),
        );
        await store.completeJuryRun(run.id, data, { provider, model });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < backoffMs.length && isTransientAiError(error)) {
          await sleep(backoffMs[attempt]!);
          continue;
        }
        const message = error instanceof Error ? error.message : "unknown";
        const code = error instanceof AiActProviderError ? error.code : "jury_failed";
        await store.failJuryRun(run.id, code, message);
        break;
      }
    }

    if (lastError) {
      // Continue with remaining judges; admin stays in AI_JURY until all succeed.
    }
  }

  const progress = summarizeJuryProgress(await store.listJuryResults());
  return { progress, attempted, skippedSucceeded };
}
