import type { AiRunStatus, EventCampaign, EventPhase, JudgeType, ThemeAuditRecord, ThemeReviewStatus } from "../types";
import type { ClusteringOutput, JuryOutput, RegistrationInput } from "../validation";
import type { PublicReviewCard } from "../review";
import type { Idea, Participant, Theme, Vote, FollowupRequest, AnalysisRun, AiJuryRun, AiJuryVote } from "../types";

export type PublicLiveSnapshot = {
  phase: EventPhase;
  title: string;
  showRecentIdeas: boolean;
  stats: { participants: number; organizations: number; ideas: number; votes: number };
  recentIdeas: Array<{ body: string; createdAt: string }>;
  analysisStage: string | null;
  themes: Array<{
    id: string;
    title: string;
    description: string;
    isAiWildcard: boolean;
    voteCount: number;
    ideaCount: number;
    organizationCount: number;
  }>;
  votingEndsAt: string | null;
  countdownSeconds: number | null;
  humanTop3: Array<{ rank: number; id: string; title: string; isAiWildcard: boolean }>;
  aiTop3: Array<{ rank: number; id: string; title: string; isAiWildcard: boolean }>;
  overlap: number | null;
  groupedThemeCount: number;
  wildcardCount: number;
  juryReady: number | null;
  juryTotal: number | null;
  juryLenses: Array<{
    judge: JudgeType;
    status: "pending" | "running" | "succeeded" | "failed" | "missing";
  }> | null;
  /** The one candidate the room is looking at. Raw participant text is not included. */
  review: PublicReviewCard | null;
};

export type ParticipantContext = {
  participant: Participant | null;
  ideaCount: number;
  votesUsed: number;
  votedThemeIds: string[];
  interestThemeIds: string[];
  followupThemeIds: string[];
};

export interface MahniStore {
  ensureCampaign(): Promise<EventCampaign>;
  getCampaign(): Promise<EventCampaign | null>;
  /** Archive the closed current campaign and open a clean DRAFT with the public slug. */
  prepareNextCampaign(options: { isDemo: boolean }): Promise<EventCampaign>;

  registerParticipant(input: RegistrationInput, sessionToken: string, isDemo?: boolean): Promise<{ participant: Participant; recovered: boolean }>;
  resolveParticipant(sessionToken: string): Promise<Participant | null>;
  /** Slide the browser session forward when the same phone opens the game again. */
  touchParticipantSession(sessionToken: string): Promise<void>;
  recoverParticipantByEmail(email: string, sessionToken: string): Promise<Participant | null>;

  submitIdea(sessionToken: string, body: string, frequency: string | null, idempotencyKey?: string): Promise<{ idea: Idea; duplicate: boolean }>;
  listParticipantIdeas(sessionToken: string): Promise<Idea[]>;

  castVote(sessionToken: string, themeId: string, idempotencyKey?: string): Promise<{ vote: Vote; votesUsed: number; duplicate: boolean }>;
  setInterest(sessionToken: string, themeId: string): Promise<{ active: boolean }>;
  requestFollowup(sessionToken: string, themeId: string): Promise<FollowupRequest>;

  getParticipantContext(sessionToken: string | null): Promise<ParticipantContext>;
  getPublicLiveSnapshot(): Promise<PublicLiveSnapshot>;

  transitionPhase(to: EventPhase, options?: { votingEndsAt?: string | null }): Promise<EventCampaign>;
  setShowRecentIdeas(show: boolean): Promise<EventCampaign>;
  lockHumanResult(): Promise<EventCampaign>;

  startAnalysisRun(): Promise<AnalysisRun>;
  completeAnalysisRun(
    runId: string,
    output: ClusteringOutput,
    meta: { provider: string; model: string },
    reviews?: Array<{ reviewStatus: ThemeReviewStatus; audit: ThemeAuditRecord | null }>,
  ): Promise<void>;
  approveAudienceTheme(themeId: string): Promise<void>;
  recordAuditOverride(themeId: string, actorEmail: string, reason: string): Promise<void>;
  markThemeRework(themeId: string): Promise<void>;
  replaceReviewTheme(
    themeId: string,
    replacements: Array<{
      title: string;
      description: string;
      formulationNote: string;
      ideaIds: string[];
      reviewStatus: ThemeReviewStatus;
      audit: ThemeAuditRecord | null;
    }>,
  ): Promise<void>;
  failAnalysisRun(runId: string, code: string, message: string): Promise<void>;
  getAnalysisProgress(): Promise<{ stage: string; run: AnalysisRun | null }>;

  startJuryRun(judge: JudgeType): Promise<AiJuryRun>;
  completeJuryRun(runId: string, output: JuryOutput, meta: { provider: string; model: string }): Promise<void>;
  failJuryRun(runId: string, code: string, message: string): Promise<void>;

  listThemes(): Promise<Theme[]>;
  listThemeIdeaLinks(themeId: string): Promise<string[]>;
  /** Pull raw ideas out of one combination. They become their own items. */
  extractReviewIdeas(themeId: string, ideaIds: string[]): Promise<{ openedId: string }>;
  /** Replace the selected combinations with one newly worded idea. */
  mergeReviewThemes(
    themeIds: string[],
    result: { title: string; description: string; formulationNote: string },
  ): Promise<{ openedId: string }>;
  listIdeasAdmin(): Promise<Idea[]>;
  listParticipantsAdmin(): Promise<Array<Participant & { ideaCount: number; followupCount: number }>>;
  listVotesAdmin(): Promise<Vote[]>;
  listFollowupsAdmin(): Promise<FollowupRequest[]>;
  listJuryResults(): Promise<Array<AiJuryRun & { picks: AiJuryVote[] }>>;
  listAnalysisRunsAdmin(): Promise<AnalysisRun[]>;

  exportCsv(): Promise<string>;

  seedDemo(options: { participants: number; ideas: number }): Promise<void>;
  resetDemoOnly(): Promise<void>;
}

export function isTerminalRun(status: AiRunStatus): boolean {
  return status === "succeeded" || status === "failed";
}
