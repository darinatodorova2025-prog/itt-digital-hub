import { JUDGE_TYPES, type AiJuryRun, type EventPhase, type JudgeType } from "./types";

export type JuryJudgeStatus = {
  judge: JudgeType;
  status: AiJuryRun["status"] | "missing";
  errorCode: string | null;
  errorMessage: string | null;
};

export type JuryProgress = {
  total: number;
  succeeded: number;
  complete: boolean;
  judges: JuryJudgeStatus[];
};

export function summarizeJuryProgress(runs: Array<Pick<AiJuryRun, "judgeType" | "status" | "errorCode" | "errorMessage">>): JuryProgress {
  const byJudge = new Map<JudgeType, JuryJudgeStatus>();
  for (const judge of JUDGE_TYPES) {
    byJudge.set(judge, { judge, status: "missing", errorCode: null, errorMessage: null });
  }
  for (const run of runs) {
    byJudge.set(run.judgeType, {
      judge: run.judgeType,
      status: run.status,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
    });
  }
  const judges = [...byJudge.values()];
  const succeeded = judges.filter((j) => j.status === "succeeded").length;
  return {
    total: JUDGE_TYPES.length,
    succeeded,
    complete: succeeded === JUDGE_TYPES.length,
    judges,
  };
}

export function assertJuryCompleteForResults(progress: JuryProgress): void {
  if (progress.complete) return;
  const pending = progress.judges
    .filter((j) => j.status !== "succeeded")
    .map((j) => `${j.judge}:${j.status}`)
    .join(", ");
  throw new Error(`jury_incomplete (${progress.succeeded}/${progress.total} succeeded; pending: ${pending})`);
}

export function publicJuryLenses(phase: EventPhase, progress: JuryProgress) {
  if (phase !== "AI_JURY") return null;
  return progress.judges.map((judge) => ({
    judge: judge.judge,
    status: judge.status,
  }));
}

export function judgeLabel(judge: JudgeType): string {
  switch (judge) {
    case "business_value":
      return "Business value";
    case "feasibility":
      return "Feasibility";
    case "innovation":
      return "Innovation";
  }
}
