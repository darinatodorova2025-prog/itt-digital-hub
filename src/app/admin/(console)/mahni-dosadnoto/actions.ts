"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession, requireRole } from "@/lib/auth/session";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import type { EventPhase } from "@/mahni-dosadnoto/types";
import { runClusteringAnalysis, runFullJury } from "@/mahni-dosadnoto/ai/runner";
import { computeWinningOrganizations } from "@/mahni-dosadnoto/admin/winners";

async function assertAdmin() {
  const session = await getAdminSession();
  if (!requireRole(session, "editor")) throw new Error("unauthorized");
  return session!;
}

export async function mdTransitionPhase(to: EventPhase) {
  await assertAdmin();
  const store = getMahniStore();
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
  await runFullJury();
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdRevealResults() {
  await mdTransitionPhase("RESULTS");
}

export async function mdCloseEvent() {
  await mdTransitionPhase("CLOSED");
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
  if (process.env.NODE_ENV === "production" && process.env.MAHNI_ALLOW_DEMO_SEED !== "true") {
    throw new Error("demo_seed_blocked");
  }
  const store = getMahniStore();
  await store.seedDemo({ participants: 40, ideas: 120 });
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdResetDemo() {
  await assertAdmin();
  if (process.env.NODE_ENV === "production" && process.env.MAHNI_ALLOW_DEMO_SEED !== "true") {
    throw new Error("demo_reset_blocked");
  }
  const store = getMahniStore();
  await store.resetDemoOnly();
  revalidatePath("/admin/mahni-dosadnoto");
}

export async function mdAdminSnapshot() {
  await assertAdmin();
  const store = getMahniStore();
  const campaign = await store.ensureCampaign();
  const participants = await store.listParticipantsAdmin();
  const ideas = await store.listIdeasAdmin();
  const votes = await store.listVotesAdmin();
  const themes = await store.listThemes();
  const followups = await store.listFollowupsAdmin();
  const jury = await store.listJuryResults();
  const analysisRuns = await store.listAnalysisRunsAdmin();
  const winningOrganizations = await computeWinningOrganizations(store);
  const live = await store.getPublicLiveSnapshot();
  return {
    campaign,
    counts: { participants: participants.length, ideas: ideas.length, votes: votes.length, followups: followups.length },
    participants,
    themes,
    jury,
    analysisRuns,
    winningOrganizations,
    live,
  };
}
