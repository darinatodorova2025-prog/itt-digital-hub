"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession, requireRole } from "@/lib/auth/session";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import type { EventPhase } from "@/mahni-dosadnoto/types";
import { runClusteringAnalysis, runFullJury } from "@/mahni-dosadnoto/ai/runner";
import { runJuryWithResilience } from "@/mahni-dosadnoto/ai/jury-execution";
import { computeWinningOrganizations } from "@/mahni-dosadnoto/admin/winners";
import { summarizeJuryProgress, type JuryProgress } from "@/mahni-dosadnoto/jury-status";
import type { JudgeType } from "@/mahni-dosadnoto/types";

function mahniDemoSeedAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV === "production") {
    return process.env.MAHNI_ALLOW_DEMO_SEED === "true";
  }
  return true;
}

async function assertAdmin() {
  const session = await getAdminSession();
  if (!requireRole(session, "editor")) throw new Error("unauthorized");
  return session!;
}

export async function mdTransitionPhase(to: EventPhase) {
  await assertAdmin();
  const store = getMahniStore();
  if (to === "RESULTS") {
    const progress = summarizeJuryProgress(await store.listJuryResults());
    if (!progress.complete) {
      throw new Error(`jury_incomplete (${progress.succeeded}/${progress.total} AI judges complete)`);
    }
  }
  await store.transitionPhase(to);
  revalidatePath("/admin/mahni-dosadnoto");
  revalidatePath("/bg/mahni-dosadnoto");
  revalidatePath("/bg/mahni-dosadnoto/live");
}

export async function mdCloseCollection() {
  await assertAdmin();
  const store = getMahniStore();
  await store.transitionPhase("ANALYZING");
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdStartCollecting() {
  await mdTransitionPhase("COLLECTING");
}

export async function mdOpenVoting() {
  await mdTransitionPhase("VOTING");
}

export async function mdStartFinalCountdown() {
  await assertAdmin();
  const store = getMahniStore();
  await store.transitionPhase("FINALIZING", { votingEndsAt: new Date(Date.now() + 45_000).toISOString() });
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdCloseVoting() {
  await assertAdmin();
  const store = getMahniStore();
  await store.lockHumanResult();
  await store.transitionPhase("AI_JURY");
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdRunAnalysis() {
  await assertAdmin();
  await runClusteringAnalysis();
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdRunJury() {
  await assertAdmin();
  const result = await runFullJury();
  revalidatePath("/admin/mahni-dosadnoto");
  return { succeeded: result.progress.succeeded, complete: result.progress.complete };
}

export async function mdRetryJury(judges?: JudgeType[]) {
  await assertAdmin();
  const store = getMahniStore();
  const progress = summarizeJuryProgress(await store.listJuryResults());
  const target = judges ?? progress.judges.filter((j) => j.status !== "succeeded").map((j) => j.judge);
  if (target.length === 0) {
    const current = summarizeJuryProgress(await store.listJuryResults());
    return { succeeded: current.succeeded, complete: current.complete };
  }
  const result = await runJuryWithResilience(store, { judges: target });
  revalidatePath("/admin/mahni-dosadnoto");
  return { succeeded: result.progress.succeeded, complete: result.progress.complete };
}

export async function mdRevealResults() {
  await assertAdmin();
  const store = getMahniStore();
  const progress = summarizeJuryProgress(await store.listJuryResults());
  if (!progress.complete) {
    throw new Error(`jury_incomplete (${progress.succeeded}/${progress.total} AI judges complete)`);
  }
  await store.transitionPhase("RESULTS");
  revalidatePath("/admin/mahni-dosadnoto");
  revalidatePath("/bg/mahni-dosadnoto");
  revalidatePath("/bg/mahni-dosadnoto/live");
}

export async function mdCloseEvent() {
  await mdTransitionPhase("CLOSED");
}

export async function mdPrepareNextEvent(isDemo: boolean) {
  await assertAdmin();
  const store = getMahniStore();
  const campaign = await store.ensureCampaign();
  if (campaign.phase !== "CLOSED") throw new Error("not_closed");
  await store.prepareNextCampaign({ isDemo });
  revalidatePath("/admin/mahni-dosadnoto");
  revalidatePath("/bg/mahni-dosadnoto");
  revalidatePath("/bg/mahni-dosadnoto/live");
}

export async function mdToggleRecentIdeas(show: boolean) {
  await assertAdmin();
  const store = getMahniStore();
  await store.setShowRecentIdeas(show);
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdExportCsv() {
  await assertAdmin();
  const store = getMahniStore();
  return store.exportCsv();
}

export async function mdSeedDemo() {
  await assertAdmin();
  if (!mahniDemoSeedAllowed()) {
    throw new Error("demo_seed_blocked");
  }
  const store = getMahniStore();
  await store.seedDemo({ participants: 40, ideas: 120 });
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdResetDemo() {
  await assertAdmin();
  if (!mahniDemoSeedAllowed()) {
    throw new Error("demo_reset_blocked");
  }
  const store = getMahniStore();
  await store.resetDemoOnly();
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdAdminSnapshot() {
  await assertAdmin();
  const store = getMahniStore();
  const [campaign, participants, ideas, votes, themes, followups, jury, analysisRuns, winningOrganizations, live] =
    await Promise.all([
      store.ensureCampaign(),
      store.listParticipantsAdmin(),
      store.listIdeasAdmin(),
      store.listVotesAdmin(),
      store.listThemes(),
      store.listFollowupsAdmin(),
      store.listJuryResults(),
      store.listAnalysisRunsAdmin(),
      computeWinningOrganizations(store),
      store.getPublicLiveSnapshot(),
    ]);
  const juryProgress: JuryProgress = summarizeJuryProgress(jury);
  return {
    campaign,
    counts: { participants: participants.length, ideas: ideas.length, votes: votes.length, followups: followups.length },
    participants,
    themes,
    jury,
    juryProgress,
    analysisRuns,
    winningOrganizations,
    live,
  };
}
