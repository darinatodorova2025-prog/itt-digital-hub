import { randomUUID } from "node:crypto";
import {
  CAMPAIGN_SLUG,
  CONSENT_VERSION,
  MAX_VOTES_PER_PARTICIPANT,
  type AiJuryRun,
  type AiJuryVote,
  type AnalysisRun,
  type EventCampaign,
  type EventPhase,
  type FollowupRequest,
  type Idea,
  type IdeaFrequency,
  type InterestSignal,
  type Participant,
  type Theme,
  type ThemeAuditRecord,
  type ThemeReviewStatus,
  type Vote,
} from "../types";
import {
  assertTransition,
  followupAllowed,
  ideasAllowed,
  interestAllowed,
  votingAllowed,
} from "../state-machine";
import { assertJuryCompleteForResults, publicJuryLenses, summarizeJuryProgress } from "../jury-status";
import { hashSessionToken } from "../session-crypto";
import { PARTICIPANT_SESSION_MS } from "../session-lifetime";
import type { ClusteringOutput, JuryOutput, RegistrationInput } from "../validation";
import { validateClusteringAgainstIdeas } from "../validation";
import { aggregateAiJury, overlapCount, rankHumanThemes, type ThemeScoreRow } from "../tie-break";
import type { MahniStore, ParticipantContext, PublicLiveSnapshot } from "./types";
import { clusteringCommitTheme, clusteringCommitWildcard, hydrateThemeTrace } from "../ai/formulation";
import { draftsFromThemes, currentPublicReview, extractSources, mergeDrafts, type ReviewDraft } from "../review";
import { publicExcerpt } from "../public-excerpt";
import { isVotingTheme, votingTransitionAllowed } from "../review-status";
import { sanitizePlainText } from "../sanitize";

type SessionRow = { tokenHash: string; participantId: string; expiresAt: number };

function nowIso() {
  return new Date().toISOString();
}

function normalizeOrg(value: string) {
  return value.trim().toLocaleLowerCase("bg-BG");
}

export class MemoryMahniStore implements MahniStore {
  campaign: EventCampaign | null = null;
  participants = new Map<string, Participant>();
  sessions = new Map<string, SessionRow>();
  ideas = new Map<string, Idea>();
  themes = new Map<string, Theme>();
  themeLinks = new Map<string, Set<string>>();
  votes = new Map<string, Vote>();
  interests = new Map<string, InterestSignal>();
  followups = new Map<string, FollowupRequest>();
  analysisRuns = new Map<string, AnalysisRun>();
  juryRuns = new Map<string, AiJuryRun>();
  juryVotes = new Map<string, AiJuryVote>();
  idempotency = new Map<string, string>();
  analysisStage = "idle";

  async ensureCampaign(): Promise<EventCampaign> {
    if (this.campaign) return this.campaign;
    const t = nowIso();
    this.campaign = {
      id: randomUUID(),
      slug: CAMPAIGN_SLUG,
      title: "Махни досадното",
      phase: "DRAFT",
      showRecentIdeas: true,
      votingEndsAt: null,
      humanResultLockedAt: null,
      isDemo: false,
      paused: false,
      createdAt: t,
      updatedAt: t,
    };
    return this.campaign;
  }

  async getCampaign() {
    return this.campaign;
  }

  private campaignOrThrow() {
    if (!this.campaign) throw new Error("Campaign not initialized");
    return this.campaign;
  }

  /** Closed campaigns kept in memory so a new run does not erase them. */
  archived: EventCampaign[] = [];

  private resolveSession(token: string): Participant | null {
    const hash = hashSessionToken(token);
    const row = this.sessions.get(hash);
    if (!row || row.expiresAt < Date.now()) return null;
    return this.participants.get(row.participantId) ?? null;
  }

  /** A session from a previous campaign must not act as a participant of the current one. */
  private currentParticipant(token: string): Participant | null {
    if (!this.campaign) return null;
    const participant = this.resolveSession(token);
    if (!participant || participant.campaignId !== this.campaign.id) return null;
    return participant;
  }

  private bindSession(token: string, participantId: string) {
    const hash = hashSessionToken(token);
    this.sessions.set(hash, { tokenHash: hash, participantId, expiresAt: Date.now() + PARTICIPANT_SESSION_MS });
  }

  async touchParticipantSession(token: string) {
    const hash = hashSessionToken(token);
    const row = this.sessions.get(hash);
    if (!row || row.expiresAt < Date.now()) return;
    row.expiresAt = Date.now() + PARTICIPANT_SESSION_MS;
  }

  async registerParticipant(input: RegistrationInput, sessionToken: string, isDemo = false) {
    const campaign = await this.ensureCampaign();
    const existing = [...this.participants.values()].find(
      (p) => p.email.toLowerCase() === input.email.toLowerCase() && p.campaignId === campaign.id,
    );
    if (existing) {
      this.bindSession(sessionToken, existing.id);
      return { participant: existing, recovered: true };
    }
    const t = nowIso();
    const participant: Participant = {
      id: randomUUID(),
      campaignId: campaign.id,
      firstName: sanitizePlainText(input.firstName, 80),
      lastName: sanitizePlainText(input.lastName, 80),
      organization: sanitizePlainText(input.organization, 160),
      role: sanitizePlainText(input.role, 120),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      marketingConsent: Boolean(input.marketingConsent),
      marketingConsentAt: input.marketingConsent ? t : null,
      marketingConsentVersion: input.marketingConsent ? CONSENT_VERSION : null,
      isDemo,
      createdAt: t,
    };
    this.participants.set(participant.id, participant);
    this.bindSession(sessionToken, participant.id);
    return { participant, recovered: false };
  }

  async resolveParticipant(sessionToken: string) {
    return this.resolveSession(sessionToken);
  }

  async recoverParticipantByEmail(email: string, sessionToken: string) {
    const campaign = await this.ensureCampaign();
    const found = [...this.participants.values()].find(
      (p) => p.email === email.trim().toLowerCase() && p.campaignId === campaign.id,
    );
    if (!found) return null;
    this.bindSession(sessionToken, found.id);
    return found;
  }

  async submitIdea(sessionToken: string, body: string, frequency: string | null, idempotencyKey?: string) {
    const campaign = this.campaignOrThrow();
    if (!ideasAllowed(campaign.phase)) throw new Error("not_collecting");
    if (campaign.paused) throw new Error("paused");
    const participant = this.currentParticipant(sessionToken);
    if (!participant) throw new Error("unauthorized");
    if (idempotencyKey) {
      const key = `idea:${participant.id}:${idempotencyKey}`;
      const existingId = this.idempotency.get(key);
      if (existingId) {
        const idea = this.ideas.get(existingId)!;
        return { idea, duplicate: true };
      }
    }
    const idea: Idea = {
      id: randomUUID(),
      campaignId: campaign.id,
      participantId: participant.id,
      organization: participant.organization,
      role: participant.role,
      body: sanitizePlainText(body, 4000),
      frequency: (frequency as IdeaFrequency | null) ?? null,
      createdAt: nowIso(),
      isDemo: participant.isDemo,
    };
    this.ideas.set(idea.id, idea);
    if (idempotencyKey) this.idempotency.set(`idea:${participant.id}:${idempotencyKey}`, idea.id);
    return { idea, duplicate: false };
  }

  async listParticipantIdeas(sessionToken: string) {
    const participant = this.resolveSession(sessionToken);
    if (!participant) return [];
    return [...this.ideas.values()].filter((i) => i.participantId === participant.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private votesForParticipant(participantId: string) {
    return [...this.votes.values()].filter((v) => v.participantId === participantId);
  }

  async castVote(sessionToken: string, themeId: string, idempotencyKey?: string) {
    this.maybeAutoCloseVoting();
    const campaign = this.campaignOrThrow();
    if (!votingAllowed(campaign.phase, campaign.votingEndsAt)) throw new Error("not_voting");
    if (campaign.paused) throw new Error("paused");
    const participant = this.currentParticipant(sessionToken);
    if (!participant) throw new Error("unauthorized");
    const theme = this.themes.get(themeId);
    if (!theme || theme.campaignId !== campaign.id) throw new Error("invalid_theme");
    if (!isVotingTheme(theme)) throw new Error("invalid_theme");
    const existingForTheme = this.votesForParticipant(participant.id).find((v) => v.themeId === themeId);
    if (existingForTheme) return { vote: existingForTheme, votesUsed: this.votesForParticipant(participant.id).length, duplicate: true };
    const used = this.votesForParticipant(participant.id).length;
    if (used >= MAX_VOTES_PER_PARTICIPANT) throw new Error("vote_limit");
    if (idempotencyKey) {
      const key = `vote:${participant.id}:${idempotencyKey}`;
      const existingId = this.idempotency.get(key);
      if (existingId) {
        const vote = this.votes.get(existingId)!;
        return { vote, votesUsed: this.votesForParticipant(participant.id).length, duplicate: true };
      }
    }
    const vote: Vote = {
      id: randomUUID(),
      campaignId: campaign.id,
      participantId: participant.id,
      themeId,
      createdAt: nowIso(),
    };
    this.votes.set(vote.id, vote);
    if (idempotencyKey) this.idempotency.set(`vote:${participant.id}:${idempotencyKey}`, vote.id);
    return { vote, votesUsed: this.votesForParticipant(participant.id).length, duplicate: false };
  }

  async setInterest(sessionToken: string, themeId: string) {
    const campaign = this.campaignOrThrow();
    if (!interestAllowed(campaign.phase)) throw new Error("not_allowed");
    const participant = this.currentParticipant(sessionToken);
    if (!participant) throw new Error("unauthorized");
    const theme = this.themes.get(themeId);
    if (!theme || theme.campaignId !== campaign.id) throw new Error("invalid_theme");
    const key = `${participant.id}:${themeId}`;
    const existing = [...this.interests.values()].find((i) => i.participantId === participant.id && i.themeId === themeId);
    if (existing) return { active: true };
    const row: InterestSignal = {
      id: randomUUID(),
      campaignId: campaign.id,
      participantId: participant.id,
      themeId,
      organization: participant.organization,
      createdAt: nowIso(),
    };
    this.interests.set(key, row);
    return { active: true };
  }

  async requestFollowup(sessionToken: string, themeId: string) {
    const campaign = this.campaignOrThrow();
    if (!followupAllowed(campaign.phase)) throw new Error("not_allowed");
    const participant = this.currentParticipant(sessionToken);
    if (!participant) throw new Error("unauthorized");
    const theme = this.themes.get(themeId);
    if (!theme || theme.campaignId !== campaign.id) throw new Error("invalid_theme");
    const row: FollowupRequest = {
      id: randomUUID(),
      campaignId: campaign.id,
      participantId: participant.id,
      organization: participant.organization,
      themeId,
      createdAt: nowIso(),
    };
    this.followups.set(row.id, row);
    return row;
  }

  async getParticipantContext(sessionToken: string | null): Promise<ParticipantContext> {
    const participant = sessionToken ? this.currentParticipant(sessionToken) : null;
    if (!participant) {
      return { participant: null, ideaCount: 0, votesUsed: 0, votedThemeIds: [], interestThemeIds: [], followupThemeIds: [] };
    }
    const votes = this.votesForParticipant(participant.id);
    return {
      participant,
      ideaCount: [...this.ideas.values()].filter((i) => i.participantId === participant.id).length,
      votesUsed: votes.length,
      votedThemeIds: votes.map((vote) => vote.themeId),
      interestThemeIds: [...this.interests.values()].filter((i) => i.participantId === participant.id).map((i) => i.themeId),
      followupThemeIds: [...this.followups.values()].filter((f) => f.participantId === participant.id).map((f) => f.themeId),
    };
  }

  private orgCounts() {
    const campaign = this.campaignOrThrow();
    const orgs = new Set<string>();
    for (const p of this.participants.values()) {
      if (p.campaignId === campaign.id) orgs.add(normalizeOrg(p.organization));
    }
    return orgs.size;
  }

  private themeVoteCounts() {
    const map = new Map<string, number>();
    for (const v of this.votes.values()) map.set(v.themeId, (map.get(v.themeId) ?? 0) + 1);
    return map;
  }

  private buildThemeScores(): ThemeScoreRow[] {
    const voteCounts = this.themeVoteCounts();
    const interestByTheme = new Map<string, Set<string>>();
    for (const sig of this.interests.values()) {
      if (!interestByTheme.has(sig.themeId)) interestByTheme.set(sig.themeId, new Set());
      interestByTheme.get(sig.themeId)!.add(normalizeOrg(sig.organization));
    }
    const campaign = this.campaignOrThrow();
    return [...this.themes.values()].filter((theme) => theme.campaignId === campaign.id).map((theme) => ({
      theme,
      voteCount: voteCounts.get(theme.id) ?? 0,
      interestOrgCount: interestByTheme.get(theme.id)?.size ?? 0,
      submissionOrgCount: theme.organizationCount,
    }));
  }

  private maybeAutoCloseVoting() {
    const campaign = this.campaign;
    if (!campaign || campaign.phase !== "FINALIZING" || !campaign.votingEndsAt) return;
    if (Date.parse(campaign.votingEndsAt) > Date.now()) return;
    if (!campaign.humanResultLockedAt) campaign.humanResultLockedAt = nowIso();
    campaign.phase = "AI_JURY";
    campaign.updatedAt = nowIso();
  }

  async getPublicLiveSnapshot(): Promise<PublicLiveSnapshot> {
    this.maybeAutoCloseVoting();
    const campaign = await this.ensureCampaign();
    const ideaList = [...this.ideas.values()].filter((i) => i.campaignId === campaign.id);
    const recent = ideaList
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((i) => ({ body: publicExcerpt(i.body, { organization: i.organization, max: 180 }), createdAt: i.createdAt }));
    const voteCounts = this.themeVoteCounts();
    const campaignThemes = [...this.themes.values()].filter((theme) => theme.campaignId === campaign.id);
    const ballot = campaignThemes.filter(isVotingTheme);
    const themes = ballot
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        isAiWildcard: t.isAiWildcard,
        voteCount: voteCounts.get(t.id) ?? 0,
        ideaCount: t.ideaCount,
        organizationCount: t.organizationCount,
      }));
    const ranked = rankHumanThemes(this.buildThemeScores().filter((row) => isVotingTheme(row.theme)));
    const humanTop3 = ranked.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      id: r.theme.id,
      title: r.theme.title,
      isAiWildcard: r.theme.isAiWildcard,
    }));
    const juryPicks = [...this.juryVotes.values()];
    const aiAgg = aggregateAiJury(
      juryPicks.map((p) => ({ themeId: p.themeId, rank: p.rank })),
      campaignThemes.filter(isVotingTheme),
    );
    const aiTop3 = aiAgg.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      id: r.theme.id,
      title: r.theme.title,
      isAiWildcard: r.theme.isAiWildcard,
    }));
    let countdownSeconds: number | null = null;
    if (campaign.phase === "FINALIZING" && campaign.votingEndsAt) {
      countdownSeconds = Math.max(0, Math.ceil((Date.parse(campaign.votingEndsAt) - Date.now()) / 1000));
    }
    const storedThemes = campaignThemes;
    const juryProgress = summarizeJuryProgress(await this.listJuryResults());
    const showResults = campaign.phase === "RESULTS" || campaign.phase === "CLOSED";
    const finalsReady = campaign.phase === "ANALYZING" && votingTransitionAllowed(campaignThemes).ok;
    return {
      phase: campaign.phase,
      paused: campaign.paused === true,
      title: campaign.title,
      showRecentIdeas: campaign.showRecentIdeas,
      stats: {
        participants: [...this.participants.values()].filter((p) => p.campaignId === campaign.id).length,
        organizations: this.orgCounts(),
        ideas: ideaList.length,
        votes: [...this.votes.values()].filter((v) => v.campaignId === campaign.id).length,
      },
      recentIdeas: campaign.showRecentIdeas && campaign.phase === "COLLECTING" ? recent : [],
      analysisStage: campaign.phase === "ANALYZING" ? this.analysisStage : null,
      themes: campaign.phase === "VOTING" || campaign.phase === "FINALIZING" || campaign.phase === "RESULTS" || campaign.phase === "CLOSED" || finalsReady ? themes : [],
      votingEndsAt: campaign.votingEndsAt,
      countdownSeconds,
      humanTop3: showResults ? humanTop3 : [],
      aiTop3: showResults ? aiTop3 : [],
      overlap: showResults
        ? overlapCount(
            ranked.slice(0, 3).map((r) => r.theme.id),
            aiAgg.slice(0, 3).map((r) => r.themeId),
          )
        : null,
      groupedThemeCount: storedThemes.filter((theme) => !theme.isAiWildcard).length,
      wildcardCount: storedThemes.filter((theme) => theme.isAiWildcard).length,
      juryReady: campaign.phase === "AI_JURY" ? juryProgress.succeeded : null,
      juryTotal: campaign.phase === "AI_JURY" ? juryProgress.total : null,
      juryLenses: publicJuryLenses(campaign.phase, juryProgress),
      review: campaign.phase === "ANALYZING" ? currentPublicReview(await this.listThemes(), ideaList) : null,
    };
  }

  async transitionPhase(to: EventPhase, options?: { votingEndsAt?: string | null }) {
    const campaign = this.campaignOrThrow();
    assertTransition(campaign.phase, to);
    if (to === "RESULTS") {
      const runs = await this.listJuryResults();
      assertJuryCompleteForResults(summarizeJuryProgress(runs));
    }
    if (to === "VOTING") {
      const ready = votingTransitionAllowed([...this.themes.values()].filter((theme) => theme.campaignId === campaign.id));
      if (!ready.ok) throw new Error(ready.reason);
    }
    if (campaign.phase === to) return campaign;
    campaign.phase = to;
    campaign.updatedAt = nowIso();
    if (options && "votingEndsAt" in options) campaign.votingEndsAt = options.votingEndsAt ?? null;
    if (to === "FINALIZING" && !campaign.votingEndsAt) {
      campaign.votingEndsAt = new Date(Date.now() + 45_000).toISOString();
    }
    return campaign;
  }

  async setEventPaused(paused: boolean) {
    const campaign = this.campaignOrThrow();
    campaign.paused = paused;
    campaign.updatedAt = nowIso();
    return campaign;
  }

  async reopenCollection() {
    const campaign = this.campaignOrThrow();
    campaign.phase = "COLLECTING";
    campaign.paused = false;
    campaign.votingEndsAt = null;
    campaign.updatedAt = nowIso();
    return campaign;
  }

  async stopEvent() {
    const campaign = this.campaignOrThrow();
    campaign.phase = "CLOSED";
    campaign.paused = false;
    campaign.updatedAt = nowIso();
    return campaign;
  }

  async restartEvent(options: { isDemo: boolean }) {
    const current = await this.ensureCampaign();
    current.phase = "CLOSED";
    current.paused = false;
    return this.prepareNextCampaign(options);
  }

  async setShowRecentIdeas(show: boolean) {
    const campaign = this.campaignOrThrow();
    campaign.showRecentIdeas = show;
    campaign.updatedAt = nowIso();
    return campaign;
  }

  async lockHumanResult() {
    const campaign = this.campaignOrThrow();
    campaign.humanResultLockedAt = nowIso();
    campaign.updatedAt = nowIso();
    return campaign;
  }

  async startAnalysisRun() {
    const campaign = this.campaignOrThrow();
    const run: AnalysisRun = {
      id: randomUUID(),
      campaignId: campaign.id,
      status: "running",
      provider: null,
      model: null,
      attempt: 1,
      errorCode: null,
      errorMessage: null,
      startedAt: nowIso(),
      finishedAt: null,
      createdAt: nowIso(),
    };
    this.analysisRuns.set(run.id, run);
    this.analysisStage = "reading";
    return run;
  }

  async completeAnalysisRun(
    runId: string,
    output: ClusteringOutput,
    meta: { provider: string; model: string },
    reviews?: Array<{ reviewStatus: ThemeReviewStatus; audit: ThemeAuditRecord | null }>,
  ) {
    const campaign = this.campaignOrThrow();
    const run = this.analysisRuns.get(runId);
    if (!run) throw new Error("run_not_found");
    const ideaIds = new Set([...this.ideas.values()].filter((i) => i.campaignId === campaign.id).map((i) => i.id));
    const valid = validateClusteringAgainstIdeas(output, ideaIds);
    if (!valid.ok) throw new Error(valid.reason);
    for (const [id, theme] of [...this.themes]) {
      if (theme.campaignId === campaign.id) {
        this.themes.delete(id);
        this.themeLinks.delete(id);
      }
    }
    const ideaRows = [...this.ideas.values()].filter((idea) => idea.campaignId === campaign.id);
    let order = 0;
    for (const theme of output.themes) {
      const committed = clusteringCommitTheme(theme, ideaRows);
      const orgs = new Set<string>();
      for (const id of theme.ideaIds) {
        const idea = this.ideas.get(id);
        if (idea) orgs.add(normalizeOrg(idea.organization));
      }
      const stamp = reviews?.[order];
      const row: Theme = {
        id: randomUUID(),
        campaignId: campaign.id,
        analysisRunId: runId,
        title: committed.title,
        description: committed.description,
        isAiWildcard: false,
        sortOrder: order,
        ideaCount: theme.ideaIds.length,
        organizationCount: orgs.size,
        createdAt: nowIso(),
        formulationNote: committed.formulationNote,
        sourceIdeas: committed.sourceIdeas,
        reviewStatus: stamp?.reviewStatus ?? "review_ready",
        audit: stamp?.audit ?? null,
        auditOverride: null,
      };
      order += 1;
      this.themes.set(row.id, row);
      this.themeLinks.set(row.id, new Set(theme.ideaIds));
    }
    const wildcard = clusteringCommitWildcard(output.wildcard);
    const wc: Theme = {
      id: randomUUID(),
      campaignId: campaign.id,
      analysisRunId: runId,
      title: wildcard.title,
      description: wildcard.description,
      isAiWildcard: true,
      sortOrder: order,
      ideaCount: 0,
      organizationCount: 0,
      createdAt: nowIso(),
      formulationNote: wildcard.formulationNote,
      sourceIdeas: [],
      reviewStatus: "pending",
      audit: null,
      auditOverride: null,
    };
    this.themes.set(wc.id, wc);
    this.themeLinks.set(wc.id, new Set());
    run.status = "succeeded";
    run.provider = meta.provider;
    run.model = meta.model;
    run.finishedAt = nowIso();
    this.analysisStage = "complete";
  }

  async failAnalysisRun(runId: string, code: string, message: string) {
    const run = this.analysisRuns.get(runId);
    if (!run) return;
    run.status = "failed";
    run.errorCode = code;
    run.errorMessage = message;
    run.finishedAt = nowIso();
    this.analysisStage = "failed";
  }

  async getAnalysisProgress() {
    const runs = [...this.analysisRuns.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { stage: this.analysisStage, run: runs[0] ?? null };
  }

  async startJuryRun(judge: import("../types").JudgeType) {
    const campaign = this.campaignOrThrow();
    const previous = [...this.juryRuns.values()].find((run) => run.campaignId === campaign.id && run.judgeType === judge);
    const run: AiJuryRun = {
      id: previous?.id ?? randomUUID(),
      campaignId: campaign.id,
      judgeType: judge,
      status: "running",
      provider: null,
      model: null,
      attempt: (previous?.attempt ?? 0) + 1,
      errorCode: null,
      errorMessage: null,
      startedAt: nowIso(),
      finishedAt: null,
      createdAt: previous?.createdAt ?? nowIso(),
    };
    this.juryRuns.set(run.id, run);
    return run;
  }

  async completeJuryRun(runId: string, output: JuryOutput, meta: { provider: string; model: string }) {
    const run = this.juryRuns.get(runId);
    if (!run) throw new Error("run_not_found");
    for (const pick of output.picks) {
      if (!this.themes.has(pick.themeId)) throw new Error("invalid_theme");
      const row: AiJuryVote = {
        id: randomUUID(),
        juryRunId: runId,
        themeId: pick.themeId,
        rank: pick.rank,
        rationale: pick.rationale,
      };
      this.juryVotes.set(row.id, row);
    }
    run.status = "succeeded";
    run.provider = meta.provider;
    run.model = meta.model;
    run.finishedAt = nowIso();
  }

  async failJuryRun(runId: string, code: string, message: string) {
    const run = this.juryRuns.get(runId);
    if (!run) return;
    run.status = "failed";
    run.errorCode = code;
    run.errorMessage = message;
    run.finishedAt = nowIso();
  }

  async listThemes() {
    const campaign = await this.ensureCampaign();
    return [...this.themes.values()]
      .filter((theme) => theme.campaignId === campaign.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((theme) =>
        hydrateThemeTrace(
          theme,
          [...(this.themeLinks.get(theme.id) ?? [])].map((id) => ({
            id,
            body: this.ideas.get(id)?.body ?? "",
          })),
        ),
      );
  }

  async listThemeIdeaLinks(themeId: string) {
    return [...(this.themeLinks.get(themeId) ?? [])];
  }

  async extractReviewIdeas(themeId: string, ideaIds: string[]) {
    const drafts = this.reviewDrafts();
    const planned = extractSources(drafts, themeId, ideaIds, ideaIds.map(() => randomUUID()));
    this.applyReviewDrafts(planned.themes);
    return { openedId: planned.openedId };
  }

  async mergeReviewThemes(themeIds: string[], result: { title: string; description: string; formulationNote: string }) {
    const drafts = this.reviewDrafts();
    const planned = mergeDrafts(drafts, themeIds, result, randomUUID());
    this.applyReviewDrafts(planned.themes);
    return { openedId: planned.openedId };
  }

  private reviewDrafts(): ReviewDraft[] {
    const campaign = this.campaignOrThrow();
    if (campaign.phase !== "ANALYZING") throw new Error("not_analyzing");
    const themes = [...this.themes.values()]
      .filter((theme) => theme.campaignId === campaign.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((theme) =>
        hydrateThemeTrace(
          theme,
          [...(this.themeLinks.get(theme.id) ?? [])].map((id) => ({
            id,
            body: this.ideas.get(id)?.body ?? "",
          })),
        ),
      );
    const ideas = [...this.ideas.values()].filter((idea) => idea.campaignId === campaign.id);
    return draftsFromThemes(themes, ideas);
  }

  private applyReviewDrafts(drafts: ReviewDraft[]) {
    const campaign = this.campaignOrThrow();
    for (const [id, theme] of [...this.themes]) {
      if (theme.campaignId === campaign.id) {
        this.themes.delete(id);
        this.themeLinks.delete(id);
      }
    }
    for (const draft of drafts) {
      const orgs = new Set(draft.sources.map((source) => normalizeOrg(source.organization)).filter((org) => org.length > 0));
      this.themes.set(draft.id, {
        id: draft.id,
        campaignId: campaign.id,
        analysisRunId: draft.analysisRunId,
        title: draft.title,
        description: draft.description,
        isAiWildcard: draft.isAiWildcard,
        sortOrder: draft.sortOrder,
        ideaCount: draft.sources.length,
        organizationCount: orgs.size,
        createdAt: nowIso(),
        formulationNote: draft.formulationNote,
        sourceIdeas: draft.sources.map((source) => ({ id: source.id, body: source.body })),
        reviewStatus: draft.reviewStatus,
        audit: null,
        auditOverride: null,
      });
      this.themeLinks.set(draft.id, new Set(draft.sources.map((source) => source.id)));
    }
  }

  private themeInReview(themeId: string): Theme {
    const campaign = this.campaignOrThrow();
    if (campaign.phase !== "ANALYZING") throw new Error("not_analyzing");
    const theme = this.themes.get(themeId);
    if (!theme || theme.campaignId !== campaign.id || theme.isAiWildcard) throw new Error("invalid_theme");
    return theme;
  }

  async approveAudienceTheme(themeId: string) {
    const theme = this.themeInReview(themeId);
    if (theme.reviewStatus !== "review_ready" && theme.reviewStatus !== "pending") throw new Error("not_review_ready");
    theme.reviewStatus = "approved";
  }

  async recordAuditOverride(themeId: string, actorEmail: string, reason: string) {
    const theme = this.themeInReview(themeId);
    if (theme.reviewStatus !== "audit_unavailable") throw new Error("not_override");
    const clean = reason.trim();
    if (clean.length < 8) throw new Error("override_reason");
    theme.auditOverride = { actorEmail, reason: clean.slice(0, 400), at: nowIso() };
    theme.reviewStatus = "review_ready";
  }

  async markThemeRework(themeId: string) {
    const theme = this.themeInReview(themeId);
    if (theme.reviewStatus !== "review_ready" && theme.reviewStatus !== "rework") throw new Error("not_review_ready");
    theme.reviewStatus = "rework";
  }

  async replaceReviewTheme(
    themeId: string,
    replacements: Array<{
      title: string;
      description: string;
      formulationNote: string;
      ideaIds: string[];
      reviewStatus: ThemeReviewStatus;
      audit: ThemeAuditRecord | null;
    }>,
  ) {
    const theme = this.themeInReview(themeId);
    const campaign = this.campaignOrThrow();
    const existing = new Set(this.themeLinks.get(themeId) ?? []);
    const nextIds = replacements.flatMap((item) => item.ideaIds);
    if (nextIds.length !== existing.size || new Set(nextIds).size !== nextIds.length || nextIds.some((id) => !existing.has(id))) {
      throw new Error("invalid_theme");
    }
    for (const id of nextIds) {
      const idea = this.ideas.get(id);
      if (!idea || idea.campaignId !== campaign.id) throw new Error("invalid_theme");
    }
    const analysisRunId = theme.analysisRunId;
    this.themes.delete(themeId);
    this.themeLinks.delete(themeId);
    replacements.forEach((item, index) => {
      const id = randomUUID();
      const sources = item.ideaIds.map((ideaId) => ({ id: ideaId, body: this.ideas.get(ideaId)?.body ?? "" }));
      const orgs = new Set(item.ideaIds.map((ideaId) => normalizeOrg(this.ideas.get(ideaId)?.organization ?? "")).filter((org) => org.length > 0));
      this.themes.set(id, {
        id,
        campaignId: campaign.id,
        analysisRunId,
        title: item.title,
        description: item.description,
        isAiWildcard: false,
        sortOrder: theme.sortOrder + index,
        ideaCount: item.ideaIds.length,
        organizationCount: orgs.size,
        createdAt: nowIso(),
        formulationNote: item.formulationNote,
        sourceIdeas: sources,
        reviewStatus: item.reviewStatus,
        audit: item.audit,
        auditOverride: null,
      });
      this.themeLinks.set(id, new Set(item.ideaIds));
    });
    const ordered = [...this.themes.values()].filter((item) => item.campaignId === campaign.id).sort((a, b) => a.sortOrder - b.sortOrder);
    ordered.forEach((item, index) => {
      item.sortOrder = index;
    });
  }

  async listIdeasAdmin() {
    const campaign = await this.ensureCampaign();
    return [...this.ideas.values()].filter((idea) => idea.campaignId === campaign.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listParticipantsAdmin() {
    const campaign = await this.ensureCampaign();
    return [...this.participants.values()].filter((p) => p.campaignId === campaign.id).map((p) => ({
      ...p,
      ideaCount: [...this.ideas.values()].filter((i) => i.participantId === p.id).length,
      followupCount: [...this.followups.values()].filter((f) => f.participantId === p.id).length,
    }));
  }

  async listVotesAdmin() {
    const campaign = await this.ensureCampaign();
    return [...this.votes.values()].filter((vote) => vote.campaignId === campaign.id);
  }

  async listFollowupsAdmin() {
    const campaign = await this.ensureCampaign();
    return [...this.followups.values()].filter((row) => row.campaignId === campaign.id);
  }

  async listJuryResults() {
    const campaign = await this.ensureCampaign();
    return [...this.juryRuns.values()].filter((run) => run.campaignId === campaign.id).map((run) => ({
      ...run,
      picks: [...this.juryVotes.values()].filter((v) => v.juryRunId === run.id),
    }));
  }

  async listAnalysisRunsAdmin() {
    const campaign = await this.ensureCampaign();
    return [...this.analysisRuns.values()]
      .filter((run) => run.campaignId === campaign.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async prepareNextCampaign(options: { isDemo: boolean }): Promise<EventCampaign> {
    const current = await this.ensureCampaign();
    if (current.phase !== "CLOSED") throw new Error("not_closed");
    const archived: EventCampaign = { ...current, slug: `${current.slug}--${current.id.slice(0, 8)}` };
    this.archived.push(archived);
    const t = nowIso();
    this.campaign = {
      id: randomUUID(),
      slug: current.slug,
      title: current.title,
      phase: "DRAFT",
      showRecentIdeas: true,
      votingEndsAt: null,
      humanResultLockedAt: null,
      isDemo: options.isDemo,
      paused: false,
      createdAt: t,
      updatedAt: t,
    };
    return this.campaign;
  }

  async exportCsv() {
    const lines = ["type,id,createdAt,detail"];
    for (const p of this.participants.values()) {
      lines.push(`participant,${p.id},${p.createdAt},"${p.firstName} ${p.lastName}"`);
    }
    for (const i of this.ideas.values()) {
      lines.push(`idea,${i.id},${i.createdAt},"${i.body.replace(/"/g, '""')}"`);
    }
    return lines.join("\n");
  }

  async seedDemo(options: { participants: number; ideas: number }) {
    await this.ensureCampaign();
    this.campaign!.isDemo = true;
    this.campaign!.phase = "COLLECTING";
    const orgs = ["ВиК София", "Aquanet Plovdiv", "HydroService", "InfraPro", "PipeTech"];
    for (let i = 0; i < options.participants; i++) {
      const token = `demo-${i}`;
      await this.registerParticipant(
        {
          firstName: `Участник${i}`,
          lastName: "Демо",
          organization: orgs[i % orgs.length]!,
          role: "Инженер",
          email: `demo${i}@example.test`,
          phone: "",
          marketingConsent: false,
        },
        token,
        true,
      );
    }
    let created = 0;
    while (created < options.ideas) {
      await this.submitIdea(`demo-${created % options.participants}`, `Демо проблем ${created + 1}: ръчно събиране на данни от Excel.`, "Всяка седмица");
      created++;
    }
  }

  async resetDemoOnly() {
    if (!this.campaign?.isDemo) throw new Error("not_demo");
    this.participants.clear();
    this.sessions.clear();
    this.ideas.clear();
    this.themes.clear();
    this.themeLinks.clear();
    this.votes.clear();
    this.interests.clear();
    this.followups.clear();
    this.analysisRuns.clear();
    this.juryRuns.clear();
    this.juryVotes.clear();
    this.campaign.phase = "DRAFT";
    this.campaign.isDemo = false;
  }
}

let singleton: MemoryMahniStore | null = null;

export function getMemoryStore(): MemoryMahniStore {
  if (!singleton) singleton = new MemoryMahniStore();
  return singleton;
}

export function resetMemoryStoreForTests() {
  singleton = new MemoryMahniStore();
  return singleton;
}
