import { describe, expect, it } from "vitest";
import { resetMemoryStoreForTests } from "@/mahni-dosadnoto/store/memory";
import { juryRunDisposition, runJuryWithResilience } from "@/mahni-dosadnoto/ai/jury-execution";
import { assertJuryCompleteForResults, summarizeJuryProgress } from "@/mahni-dosadnoto/jury-status";
import type { JudgeType, Theme } from "@/mahni-dosadnoto/types";
import type { JuryOutput } from "@/mahni-dosadnoto/validation";

const THEME_A = "11111111-1111-4111-8111-111111111111";
const THEME_B = "22222222-2222-4222-8222-222222222222";

async function seedThemes() {
  const store = resetMemoryStoreForTests();
  await store.ensureCampaign();
  if (!store.campaign) throw new Error("missing campaign");
  for (const [id, title] of [[THEME_A, "Една"], [THEME_B, "Две"]] as const) {
    const theme: Theme = {
      id,
      campaignId: store.campaign.id,
      analysisRunId: "run",
      title,
      description: "Описание на темата.",
      isAiWildcard: false,
      sortOrder: 0,
      ideaCount: 1,
      organizationCount: 1,
      createdAt: new Date().toISOString(),
    };
    store.themes.set(id, theme);
  }
  return { store };
}

function answer(called: JudgeType[]): (judge: JudgeType) => Promise<{ data: JuryOutput; provider: string; model: string }> {
  return async (judge) => {
    called.push(judge);
    return {
      data: {
        picks: [
          { themeId: THEME_A, rank: 1, rationale: "Първа по тази оценка." },
          { themeId: THEME_B, rank: 2, rationale: "Втора по тази оценка." },
        ],
      },
      provider: "test",
      model: "test-model",
    };
  };
}

describe("jury recovery", () => {
  it("treats a stale running judge as retryable and a fresh one as in flight", () => {
    const now = Date.parse("2026-09-28T10:30:00.000Z");
    expect(juryRunDisposition({ status: "running", startedAt: "2026-09-28T10:28:00.000Z" }, now)).toBe("retry");
    expect(juryRunDisposition({ status: "running", startedAt: "2026-09-28T10:29:50.000Z" }, now)).toBe("skip_fresh");
    expect(juryRunDisposition({ status: "succeeded", startedAt: "2026-09-28T10:00:00.000Z" }, now)).toBe("skip_succeeded");
    expect(juryRunDisposition({ status: "failed", startedAt: "2026-09-28T10:00:00.000Z" }, now)).toBe("retry");
  });

  it("recovers a stale running judge and does not duplicate a fresh one", async () => {
    const { store } = await seedThemes();
    const called: JudgeType[] = [];
    const stale = await store.startJuryRun("innovation");
    stale.startedAt = new Date(Date.now() - 120_000).toISOString();
    stale.status = "running";
    const fresh = await store.startJuryRun("business_value");
    fresh.startedAt = new Date().toISOString();
    fresh.status = "running";

    const result = await runJuryWithResilience(store, { complete: answer(called), budgetMs: 60_000 });

    expect(called).toContain("innovation");
    expect(called).not.toContain("business_value");
    expect(result.attempted).toContain("innovation");
    expect(result.attempted).not.toContain("business_value");
    const innovation = (await store.listJuryResults()).find((run) => run.judgeType === "innovation");
    expect(innovation?.status).toBe("succeeded");
    expect(innovation?.provider).toBe("test");
  });

  it("skips a succeeded judge and retries a failed one", async () => {
    const { store } = await seedThemes();
    const done = await store.startJuryRun("business_value");
    await store.completeJuryRun(done.id, {
      picks: [
        { themeId: THEME_A, rank: 1, rationale: "Вече е готова оценка." },
        { themeId: THEME_B, rank: 2, rationale: "Втора готова оценка." },
      ],
    }, { provider: "kept", model: "kept-model" });
    const failed = await store.startJuryRun("feasibility");
    await store.failJuryRun(failed.id, "jury_failed", "earlier");
    const called: JudgeType[] = [];

    const result = await runJuryWithResilience(store, { complete: answer(called), budgetMs: 60_000 });

    expect(result.skippedSucceeded).toContain("business_value");
    expect(called).not.toContain("business_value");
    expect(called).toContain("feasibility");
    const kept = (await store.listJuryResults()).find((run) => run.judgeType === "business_value");
    expect(kept?.provider).toBe("kept");
    expect(kept?.status).toBe("succeeded");
    const retried = (await store.listJuryResults()).find((run) => run.judgeType === "feasibility");
    expect(retried?.status).toBe("succeeded");
  });

  it("blocks results until all three judges succeed", () => {
    const partial = summarizeJuryProgress([
      { judgeType: "business_value", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "feasibility", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "innovation", status: "failed", errorCode: "jury_failed", errorMessage: "x" },
    ]);
    expect(() => assertJuryCompleteForResults(partial)).toThrow(/jury_incomplete/);
    const full = summarizeJuryProgress([
      { judgeType: "business_value", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "feasibility", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "innovation", status: "succeeded", errorCode: null, errorMessage: null },
    ]);
    expect(full.complete).toBe(true);
    expect(() => assertJuryCompleteForResults(full)).not.toThrow();
  });
});
