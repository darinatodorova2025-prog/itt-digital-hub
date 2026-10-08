export const EVENT_PHASES = [
  "DRAFT",
  "COLLECTING",
  "ANALYZING",
  "VOTING",
  "FINALIZING",
  "AI_JURY",
  "RESULTS",
  "CLOSED",
] as const;

export type EventPhase = (typeof EVENT_PHASES)[number];

export const IDEA_FREQUENCIES = [
  "Всеки ден",
  "Няколко пъти седмично",
  "Всяка седмица",
  "Всеки месец",
  "Периодично",
] as const;

export type IdeaFrequency = (typeof IDEA_FREQUENCIES)[number];

export const AI_RUN_STATUSES = ["pending", "running", "succeeded", "failed"] as const;
export type AiRunStatus = (typeof AI_RUN_STATUSES)[number];

export const JUDGE_TYPES = ["business_value", "feasibility", "innovation"] as const;
export type JudgeType = (typeof JUDGE_TYPES)[number];

export const CAMPAIGN_SLUG = "mahni-dosadnoto-vik-2026";

export const CONSENT_VERSION = "2026-03-27-v1";

export const MAX_VOTES_PER_PARTICIPANT = 3;

export interface EventCampaign {
  id: string;
  slug: string;
  title: string;
  phase: EventPhase;
  showRecentIdeas: boolean;
  votingEndsAt: string | null;
  humanResultLockedAt: string | null;
  isDemo: boolean;
  /** Operator hold. The phase stays; the room and the phones wait. */
  paused?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  campaignId: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
  email: string;
  phone: string | null;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  marketingConsentVersion: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface Idea {
  id: string;
  campaignId: string;
  participantId: string;
  organization: string;
  role: string;
  body: string;
  frequency: IdeaFrequency | null;
  createdAt: string;
  isDemo: boolean;
}

export interface ThemeSourceIdea {
  id: string;
  body: string;
}

export const THEME_REVIEW_STATUSES = ["pending", "review_ready", "approved", "rework", "audit_unavailable"] as const;
export type ThemeReviewStatus = (typeof THEME_REVIEW_STATUSES)[number];

export interface ThemeAuditRecord {
  status: "pass" | "fail" | "split_recommended" | "unavailable";
  reasonCodes: string[];
  summary: string;
}

export interface ThemeAuditOverride {
  actorEmail: string;
  reason: string;
  at: string;
}

export interface Theme {
  id: string;
  campaignId: string;
  analysisRunId: string;
  title: string;
  description: string;
  isAiWildcard: boolean;
  sortOrder: number;
  ideaCount: number;
  organizationCount: number;
  createdAt: string;
  /** How the combined wording was reached. Empty until a trace is stored or rebuilt from the source ideas. */
  formulationNote?: string;
  /** Idea ids and original text captured when the theme was combined. */
  sourceIdeas?: ThemeSourceIdea[];
  /** Audience decision. Missing means not approved. */
  reviewStatus?: ThemeReviewStatus;
  /** Concise JAV decision. Never a private chain of thought. */
  audit?: ThemeAuditRecord | null;
  /** Recorded when an operator continues without JAV. */
  auditOverride?: ThemeAuditOverride | null;
}

export interface ThemeIdeaLink {
  themeId: string;
  ideaId: string;
}

export interface Vote {
  id: string;
  campaignId: string;
  participantId: string;
  themeId: string;
  createdAt: string;
}

export interface InterestSignal {
  id: string;
  campaignId: string;
  participantId: string;
  themeId: string;
  organization: string;
  createdAt: string;
}

export interface FollowupRequest {
  id: string;
  campaignId: string;
  participantId: string;
  organization: string;
  themeId: string;
  createdAt: string;
}

export interface AnalysisRun {
  id: string;
  campaignId: string;
  status: AiRunStatus;
  provider: string | null;
  model: string | null;
  attempt: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AiJuryRun {
  id: string;
  campaignId: string;
  judgeType: JudgeType;
  status: AiRunStatus;
  provider: string | null;
  model: string | null;
  attempt: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AiJuryVote {
  id: string;
  juryRunId: string;
  themeId: string;
  rank: number;
  rationale: string;
}
