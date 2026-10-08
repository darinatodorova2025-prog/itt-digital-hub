import "server-only";

import { AiActProviderError } from "@/lib/ai-act/errors";
import type { JudgeType } from "../types";
import { JUDGE_TYPES } from "../types";
import { juryOutputSchemaFor, juryPickCount, type JuryOutput } from "../validation";
import type { MahniStore } from "../store/types";
import { summarizeJuryProgress } from "../jury-status";
import { isVotingTheme } from "../review-status";
import { completeClusteringJson } from "./clustering";
import { JUDGE_PROMPTS, juryUserPrompt } from "./prompts";
import { isTransientAiError } from "./transient-errors";

/** A Sol call can run for minutes. Do not start a second run while one is still working. */
export const JURY_STALE_MS = 200_000;
export const JURY_ACTION_BUDGET_MS = 45_000;

export type JuryRunDisposition = "skip_succeeded" | "skip_fresh" | "retry";

export function juryRunDisposition(
  run: { status: string; startedAt: string | null } | null,
  now: number,
  staleMs = JURY_STALE_MS,
): JuryRunDisposition {
  if (!run || (run.status !== "succeeded" && run.status !== "running")) return "retry";
  if (run.status === "succeeded") return "skip_succeeded";
  const started = run.startedAt ? Date.parse(run.startedAt) : Number.NaN;
  if (Number.isFinite(started) && now - started < staleMs) return "skip_fresh";
  return "retry";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function latestRunForJudge(store: MahniStore, judge: JudgeType) {
  const runs = await store.listJuryResults();
  return (
    runs
      .filter((run) => run.judgeType === judge)
      .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))[0] ?? null
  );
}

export type JuryCaller = (
  judge: JudgeType,
  themes: Array<{ id: string; title: string; description: string; isAiWildcard: boolean }>,
) => Promise<{ data: JuryOutput; provider: string; model: string }>;

export type RunJuryOptions = {
  judges?: JudgeType[];
  now?: number;
  staleMs?: number;
  budgetMs?: number;
  complete?: JuryCaller;
};

export type RunJuryResult = {
  progress: ReturnType<typeof summarizeJuryProgress>;
  attempted: JudgeType[];
  skippedSucceeded: JudgeType[];
};

async function callProvider(
  judge: JudgeType,
  themes: Array<{ id: string; title: string; description: string; isAiWildcard: boolean }>,
): Promise<{ data: JuryOutput; provider: string; model: string }> {
  const count = juryPickCount(themes.length);
  const schema = juryOutputSchemaFor(count);
  const system = JUDGE_PROMPTS[judge];
  const user = juryUserPrompt(themes);
  return completeClusteringJson(schema, system, user);
}

function picksFit(
  data: JuryOutput,
  themeIds: Set<string>,
  count: number,
): boolean {
  if (data.picks.length !== count) return false;
  const seenThemes = new Set<string>();
  const seenRanks = new Set<number>();
  for (const pick of data.picks) {
    if (!themeIds.has(pick.themeId) || seenThemes.has(pick.themeId) || seenRanks.has(pick.rank)) return false;
    seenThemes.add(pick.themeId);
    seenRanks.add(pick.rank);
  }
  return true;
}

export async function runJuryWithResilience(store: MahniStore, options: RunJuryOptions = {}): Promise<RunJuryResult> {
  const themes = (await store.listThemes()).filter(isVotingTheme);
  const themePayload = themes.map((theme) => ({
    id: theme.id,
    title: theme.title,
    description: theme.description,
    isAiWildcard: theme.isAiWildcard,
  }));
  const themeIds = new Set(themePayload.map((theme) => theme.id));
  const pickCount = juryPickCount(themePayload.length);
  if (pickCount === 0) throw new Error("no_themes");

  const targetJudges = options.judges ?? [...JUDGE_TYPES];
  const staleMs = options.staleMs ?? JURY_STALE_MS;
  const deadline = (options.now ?? Date.now()) + (options.budgetMs ?? JURY_ACTION_BUDGET_MS);
  const attempted: JudgeType[] = [];
  const skippedSucceeded: JudgeType[] = [];
  const call = options.complete ?? callProvider;

  for (const judge of JUDGE_TYPES) {
    if (!targetJudges.includes(judge)) continue;
    const existing = await latestRunForJudge(store, judge);
    const disposition = juryRunDisposition(existing, Date.now(), staleMs);
    if (disposition === "skip_succeeded") {
      skippedSucceeded.push(judge);
      continue;
    }
    if (disposition === "skip_fresh") continue;
    if (Date.now() > deadline) break;

    attempted.push(judge);
    const run = await store.startJuryRun(judge);
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await call(judge, themePayload);
        if (!picksFit(result.data, themeIds, pickCount)) throw new Error("invalid_picks");
        await store.completeJuryRun(run.id, result.data, { provider: result.provider, model: result.model });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0 && isTransientAiError(error)) {
          await sleep(2_000);
          continue;
        }
        break;
      }
    }
    if (lastError) {
      const message = lastError instanceof Error ? lastError.message : "unknown";
      const code = lastError instanceof AiActProviderError ? lastError.code : "jury_failed";
      await store.failJuryRun(run.id, code, message);
    }
  }

  const progress = summarizeJuryProgress(await store.listJuryResults());
  return { progress, attempted, skippedSucceeded };
}
