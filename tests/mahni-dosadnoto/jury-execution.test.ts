import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MahniStore } from "@/mahni-dosadnoto/store/types";
import type { JudgeType, Theme } from "@/mahni-dosadnoto/types";
import { runJuryWithResilience } from "@/mahni-dosadnoto/ai/jury-execution";

const completeJsonWithRetry = vi.fn();

vi.mock("@/mahni-dosadnoto/ai/provider", () => ({
  completeJsonWithRetry: (...args: unknown[]) => completeJsonWithRetry(...args),
}));

const theme: Theme = {
  id: "00000000-0000-4000-8000-000000000001",
  campaignId: "c",
  analysisRunId: "r",
  title: "Theme",
  description: "Description long enough.",
  isAiWildcard: false,
  sortOrder: 0,
  ideaCount: 1,
  organizationCount: 1,
  createdAt: new Date().toISOString(),
  reviewStatus: "approved",
};

function mockStore(runs: Array<{ judgeType: JudgeType; status: "succeeded" | "failed" | "running" }>): {
  store: MahniStore;
  started: JudgeType[];
} {
  const started: JudgeType[] = [];
  const store = {
    listThemes: async () => [theme],
    listJuryResults: async () =>
      runs.map((r) => ({
        id: `run-${r.judgeType}`,
        campaignId: "c",
        judgeType: r.judgeType,
        status: r.status,
        provider: null,
        model: null,
        errorCode: r.status === "failed" ? "rate_limited" : null,
        errorMessage: r.status === "failed" ? "429" : null,
        startedAt: new Date().toISOString(),
        finishedAt: null,
      })),
    startJuryRun: async (judge: JudgeType) => {
      started.push(judge);
      return {
        id: `run-${judge}`,
        campaignId: "c",
        judgeType: judge,
        status: "running" as const,
        provider: null,
        model: null,
        errorCode: null,
        errorMessage: null,
        startedAt: new Date().toISOString(),
        finishedAt: null,
      };
    },
    completeJuryRun: async () => {},
    failJuryRun: async () => {},
  } as unknown as MahniStore;
  return { store, started };
}

describe("runJuryWithResilience", () => {
  beforeEach(() => {
    completeJsonWithRetry.mockReset();
    completeJsonWithRetry.mockResolvedValue({
      data: {
        picks: [{ themeId: theme.id, rank: 1, rationale: "Because it matters for the audience." }],
      },
      provider: "test",
      model: "test",
    });
  });

  it("does not restart judges that already succeeded", async () => {
    const { store, started } = mockStore([
      { judgeType: "business_value", status: "succeeded" },
      { judgeType: "feasibility", status: "succeeded" },
      { judgeType: "innovation", status: "failed" },
    ]);

    const result = await runJuryWithResilience(store);

    expect(started).toEqual(["innovation"]);
    expect(result.skippedSucceeded).toEqual(["business_value", "feasibility"]);
    expect(result.progress.succeeded).toBe(2);
  });
});
