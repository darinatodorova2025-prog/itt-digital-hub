import { parseSourceIdeas } from "../../ai/formulation";
import { isThemeReviewStatus } from "../../review-status";
import type { ThemeAuditOverride, ThemeAuditRecord } from "../../types";
import type {
  AiJuryRun,
  AiJuryVote,
  AnalysisRun,
  EventCampaign,
  EventPhase,
  FollowupRequest,
  Idea,
  JudgeType,
  Participant,
  Theme,
  Vote,
} from "../../types";
import { CAMPAIGN_SLUG } from "../../types";

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  phase: EventPhase;
  show_recent_ideas: boolean;
  voting_ends_at: string | null;
  human_result_locked_at: string | null;
  is_demo: boolean;
  paused?: boolean;
  created_at: string;
  updated_at: string;
};

export function mapCampaign(row: CampaignRow): EventCampaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    phase: row.phase,
    showRecentIdeas: row.show_recent_ideas,
    votingEndsAt: row.voting_ends_at,
    humanResultLockedAt: row.human_result_locked_at,
    isDemo: row.is_demo,
    paused: row.paused === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ParticipantRow = {
  id: string;
  campaign_id: string;
  first_name: string;
  last_name: string;
  organization: string;
  role: string;
  email: string;
  phone: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  marketing_consent_version: string | null;
  is_demo: boolean;
  created_at: string;
};

export function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    firstName: row.first_name,
    lastName: row.last_name,
    organization: row.organization,
    role: row.role,
    email: row.email,
    phone: row.phone,
    marketingConsent: row.marketing_consent,
    marketingConsentAt: row.marketing_consent_at,
    marketingConsentVersion: row.marketing_consent_version,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  };
}

export function mapIdea(row: Record<string, unknown>): Idea {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    participantId: String(row.participant_id),
    organization: String(row.organization),
    role: String(row.role),
    body: String(row.body),
    frequency: (row.frequency as Idea["frequency"]) ?? null,
    isDemo: Boolean(row.is_demo),
    createdAt: String(row.created_at),
  };
}

function parseAuditRecord(value: unknown): ThemeAuditRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { status?: unknown; reasonCodes?: unknown; summary?: unknown };
  if (row.status !== "pass" && row.status !== "fail" && row.status !== "split_recommended" && row.status !== "unavailable") return null;
  const reasonCodes = Array.isArray(row.reasonCodes) ? row.reasonCodes.filter((code): code is string => typeof code === "string").slice(0, 12) : [];
  return { status: row.status, reasonCodes, summary: typeof row.summary === "string" ? row.summary.slice(0, 400) : "" };
}

function parseAuditOverride(value: unknown): ThemeAuditOverride | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { actorEmail?: unknown; reason?: unknown; at?: unknown };
  if (typeof row.actorEmail !== "string" || typeof row.reason !== "string" || typeof row.at !== "string") return null;
  return { actorEmail: row.actorEmail, reason: row.reason, at: row.at };
}

export function mapTheme(row: Record<string, unknown>): Theme {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    analysisRunId: String(row.analysis_run_id),
    title: String(row.title),
    description: String(row.description),
    isAiWildcard: Boolean(row.is_ai_wildcard),
    sortOrder: Number(row.sort_order),
    ideaCount: Number(row.idea_count),
    organizationCount: Number(row.organization_count),
    createdAt: String(row.created_at),
    formulationNote: typeof row.formulation_note === "string" ? row.formulation_note : "",
    sourceIdeas: parseSourceIdeas(row.source_ideas),
    reviewStatus: isThemeReviewStatus(row.review_status) ? row.review_status : "review_ready",
    audit: parseAuditRecord(row.audit_record),
    auditOverride: parseAuditOverride(row.audit_override),
  };
}

export function mapVote(row: Record<string, unknown>): Vote {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    participantId: String(row.participant_id),
    themeId: String(row.theme_id),
    createdAt: String(row.created_at),
  };
}

export function mapAnalysisRun(row: Record<string, unknown>): AnalysisRun {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    status: row.status as AnalysisRun["status"],
    provider: row.provider ? String(row.provider) : null,
    model: row.model ? String(row.model) : null,
    attempt: Number(row.attempt),
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    createdAt: String(row.created_at),
  };
}

export function mapJuryRun(row: Record<string, unknown>): AiJuryRun {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    judgeType: row.judge_type as JudgeType,
    status: row.status as AiJuryRun["status"],
    provider: row.provider ? String(row.provider) : null,
    model: row.model ? String(row.model) : null,
    attempt: Number(row.attempt),
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    createdAt: String(row.created_at),
  };
}

export function mapJuryVote(row: Record<string, unknown>): AiJuryVote {
  return {
    id: String(row.id),
    juryRunId: String(row.jury_run_id),
    themeId: String(row.theme_id),
    rank: Number(row.rank),
    rationale: String(row.rationale),
  };
}

export function mapFollowup(row: Record<string, unknown>): FollowupRequest {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    participantId: String(row.participant_id),
    organization: String(row.organization),
    themeId: String(row.theme_id),
    createdAt: String(row.created_at),
  };
}

export { CAMPAIGN_SLUG };

export function mapPostgresError(error: { message?: string; code?: string }): string {
  const msg = error.message ?? "";
  if (msg.includes("not_collecting")) return "not_collecting";
  if (msg.includes("not_voting")) return "not_voting";
  if (msg.includes("vote_limit")) return "vote_limit";
  if (msg.includes("voting_closed")) return "not_voting";
  if (msg.includes("unauthorized")) return "unauthorized";
  if (msg.includes("not_closed")) return "not_closed";
  if (msg.includes("invalid_theme")) return "invalid_theme";
  if (msg.includes("review_open")) return "review_open";
  if (msg.includes("not_review_ready")) return "not_review_ready";
  if (msg.includes("not_override")) return "not_override";
  if (msg.includes("invalid_transition")) return "invalid_transition";
  if (error.code === "23505") return "duplicate";
  return "store_error";
}
