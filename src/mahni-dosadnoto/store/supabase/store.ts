import "server-only";

import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/cms/supabase-service";
import { hashSessionToken } from "../../session-crypto";
import { PARTICIPANT_SESSION_MS } from "../../session-lifetime";
import {
  CAMPAIGN_SLUG,
  CONSENT_VERSION,
  type AiJuryRun,
  type AnalysisRun,
  type EventCampaign,
  type EventPhase,
  type JudgeType,
  type Participant,
  type Theme,
  type ThemeAuditRecord,
  type ThemeReviewStatus,
  type ThemeSourceIdea,
} from "../../types";
import {
  assertTransition,
  followupAllowed,
  ideasAllowed,
  interestAllowed,
} from "../../state-machine";
import type { ClusteringOutput, JuryOutput, RegistrationInput } from "../../validation";
import { validateClusteringAgainstIdeas } from "../../validation";
import { aggregateAiJury, overlapCount, rankHumanThemes } from "../../tie-break";
import { assertJuryCompleteForResults, publicJuryLenses, summarizeJuryProgress } from "../../jury-status";
import { clusteringCommitTheme, clusteringCommitWildcard, hydrateThemeTrace } from "../../ai/formulation";
import { draftsFromThemes, currentPublicReview, extractSources, mergeDrafts, type ReviewDraft } from "../../review";
import { publicExcerpt } from "../../public-excerpt";
import { isThemeReviewStatus, isVotingTheme, votingTransitionAllowed } from "../../review-status";
import { sanitizePlainText } from "../../sanitize";
import type { MahniStore, ParticipantContext, PublicLiveSnapshot } from "../types";
import {
  mapAnalysisRun,
  mapCampaign,
  mapFollowup,
  mapIdea,
  mapJuryRun,
  mapJuryVote,
  mapParticipant,
  mapPostgresError,
  mapTheme,
  mapVote,
} from "./mappers";

export class MahniStoreUnavailableError extends Error {
  constructor(message = "Event storage is temporarily unavailable.") {
    super(message);
    this.name = "MahniStoreUnavailableError";
  }
}

function normalizeOrg(value: string) {
  return value.trim().toLocaleLowerCase("bg-BG");
}

function client() {
  try {
    return createSupabaseServiceClient();
  } catch {
    throw new MahniStoreUnavailableError();
  }
}

async function hydrateStoredThemes(sb: ReturnType<typeof client>, themes: Theme[]): Promise<Theme[]> {
  const sparseIds = themes
    .filter((theme) => !theme.isAiWildcard && (theme.sourceIdeas ?? []).length === 0)
    .map((theme) => theme.id);
  const linked = new Map<string, ThemeSourceIdea[]>();
  if (sparseIds.length > 0) {
    const { data: links, error } = await sb.from("md_theme_idea_links").select("theme_id, idea_id").in("theme_id", sparseIds);
    if (error) throw new MahniStoreUnavailableError();
    const ideaIds = [...new Set((links ?? []).map((row) => String(row.idea_id)))];
    const bodies = new Map<string, string>();
    if (ideaIds.length > 0) {
      const { data: ideas, error: ideaError } = await sb.from("md_ideas").select("id, body").in("id", ideaIds);
      if (ideaError) throw new MahniStoreUnavailableError();
      for (const idea of ideas ?? []) bodies.set(String(idea.id), String(idea.body ?? ""));
    }
    for (const link of links ?? []) {
      const themeId = String(link.theme_id);
      const ideaId = String(link.idea_id);
      const list = linked.get(themeId) ?? [];
      list.push({ id: ideaId, body: bodies.get(ideaId) ?? "" });
      linked.set(themeId, list);
    }
  }
  return themes.map((theme) => hydrateThemeTrace(theme, linked.get(theme.id) ?? []));
}

async function persistReviewDrafts(campaignId: string, previousIds: string[], drafts: ReviewDraft[]) {
  const sb = client();
  const nextIds = new Set(drafts.map((draft) => draft.id));
  const removed = previousIds.filter((id) => !nextIds.has(id));
  const payload = drafts.map((draft) => ({
    id: draft.id,
    analysisRunId: draft.analysisRunId,
    title: draft.title,
    description: draft.description,
    formulationNote: draft.formulationNote,
    isAiWildcard: draft.isAiWildcard,
    sortOrder: draft.sortOrder,
    ideaIds: draft.sources.map((source) => source.id),
    sourceIdeas: draft.sources.map((source) => ({ id: source.id, body: source.body })),
    reviewStatus: draft.reviewStatus,
  }));
  const { error } = await sb.rpc("md_replace_review_themes", {
    p_campaign_id: campaignId,
    p_remove_ids: removed,
    p_themes: payload,
  });
  if (!error) return;
  const missing = error.code === "PGRST202" || (error.message ?? "").includes("md_replace_review_themes");
  if (!missing) throw new MahniStoreUnavailableError(error.message);
  await persistReviewDraftsDirect(campaignId, removed, drafts);
}

async function persistReviewDraftsDirect(campaignId: string, removed: string[], drafts: ReviewDraft[]) {
  const sb = client();
  if (removed.length > 0) {
    const { error } = await sb.from("md_themes").delete().eq("campaign_id", campaignId).in("id", removed);
    if (error) throw new MahniStoreUnavailableError(error.message);
  }
  for (const draft of drafts) {
    const organizations = new Set(draft.sources.map((source) => source.organization.trim().toLowerCase()).filter((name) => name.length > 0));
    const row = {
      id: draft.id,
      campaign_id: campaignId,
      analysis_run_id: draft.analysisRunId,
      title: draft.title,
      description: draft.description,
      is_ai_wildcard: draft.isAiWildcard,
      sort_order: draft.sortOrder,
      idea_count: draft.sources.length,
      organization_count: organizations.size,
      formulation_note: draft.formulationNote,
      source_ideas: draft.sources.map((source) => ({ id: source.id, body: source.body })),
    };
    let { error } = await sb.from("md_themes").upsert(row);
    if (error && /formulation_note|source_ideas/.test(error.message)) {
      const { formulation_note: _note, source_ideas: _sources, ...base } = row;
      const retry = await sb.from("md_themes").upsert(base);
      error = retry.error;
    }
    if (error) throw new MahniStoreUnavailableError(error.message);
    const cleared = await sb.from("md_theme_idea_links").delete().eq("theme_id", draft.id);
    if (cleared.error) throw new MahniStoreUnavailableError(cleared.error.message);
    if (draft.sources.length > 0) {
      const linked = await sb.from("md_theme_idea_links").insert(draft.sources.map((source) => ({ theme_id: draft.id, idea_id: source.id })));
      if (linked.error) throw new MahniStoreUnavailableError(linked.error.message);
    }
    await sb.rpc("md_audit", {
      p_campaign_id: campaignId,
      p_action: "theme_review",
      p_detail: { themeId: draft.id, status: draft.reviewStatus },
    });
  }
}

function throwMapped(error: { message?: string; code?: string }): never {
  const code = mapPostgresError(error);
  throw new Error(code);
}

export class SupabaseMahniStore implements MahniStore {
  private campaignCache: EventCampaign | null = null;
  private campaignInflight: Promise<EventCampaign> | null = null;

  constructor(private readonly campaignSlug: string = CAMPAIGN_SLUG) {}

  private async loadCampaignRow(): Promise<EventCampaign> {
    const sb = client();
    const { data, error } = await sb.from("md_event_campaigns").select("*").eq("slug", this.campaignSlug).maybeSingle();
    if (error) throw new MahniStoreUnavailableError();
    if (!data) {
      const { data: inserted, error: insertError } = await sb
        .from("md_event_campaigns")
        .insert({ slug: this.campaignSlug, title: "Махни досадното", phase: "DRAFT" })
        .select("*")
        .single();
      if (insertError || !inserted) throw new MahniStoreUnavailableError();
      this.campaignCache = mapCampaign(inserted as never);
      return this.campaignCache;
    }
    // The finalizing RPC locks the campaign row. Skip it unless that phase can advance,
    // so admin reads are not a chain of row locks.
    if ((data as { phase?: string }).phase !== "FINALIZING") {
      this.campaignCache = await this.withOperatorPause(mapCampaign(data as never));
      return this.campaignCache;
    }
    await sb.rpc("md_maybe_advance_finalizing", { p_campaign_id: data.id });
    const { data: refreshed } = await sb.from("md_event_campaigns").select("*").eq("id", data.id).single();
    this.campaignCache = await this.withOperatorPause(mapCampaign((refreshed ?? data) as never));
    return this.campaignCache;
  }

  private async withOperatorPause(campaign: EventCampaign): Promise<EventCampaign> {
    const sb = client();
    const { data, error } = await sb
      .from("md_event_audit_log")
      .select("action")
      .eq("campaign_id", campaign.id)
      .in("action", ["operator_pause", "operator_resume"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return campaign;
    return { ...campaign, paused: String(data.action) === "operator_pause" };
  }

  private async writeOperatorPause(campaignId: string, paused: boolean) {
    const sb = client();
    const { error } = await sb.rpc("md_audit", {
      p_campaign_id: campaignId,
      p_action: paused ? "operator_pause" : "operator_resume",
      p_detail: {},
    });
    if (error) throw new MahniStoreUnavailableError(error.message);
  }

  async ensureCampaign(): Promise<EventCampaign> {
    if (!this.campaignInflight) {
      this.campaignInflight = this.loadCampaignRow().finally(() => {
        this.campaignInflight = null;
      });
    }
    return this.campaignInflight;
  }

  async prepareNextCampaign(options: { isDemo: boolean }): Promise<EventCampaign> {
    const sb = client();
    const { data, error } = await sb.rpc("md_prepare_next_campaign", {
      p_slug: this.campaignSlug,
      p_is_demo: options.isDemo,
    });
    if (error) throwMapped(error);
    this.campaignCache = null;
    this.campaignCache = mapCampaign(data as never);
    return this.campaignCache;
  }

  async getCampaign(): Promise<EventCampaign | null> {
    try {
      return await this.loadCampaignRow();
    } catch {
      return null;
    }
  }

  private async bindSession(token: string, participantId: string) {
    const sb = client();
    const { error } = await sb.rpc("md_upsert_session", {
      p_token_hash: hashSessionToken(token),
      p_participant_id: participantId,
    });
    if (error) throw new MahniStoreUnavailableError();
    const expiresAt = new Date(Date.now() + PARTICIPANT_SESSION_MS).toISOString();
    await sb.from("md_participant_sessions").update({ expires_at: expiresAt }).eq("token_hash", hashSessionToken(token));
  }

  async touchParticipantSession(token: string) {
    const participant = await this.resolveParticipant(token);
    if (!participant) return;
    await this.bindSession(token, participant.id);
  }

  async resolveParticipant(sessionToken: string): Promise<Participant | null> {
    const sb = client();
    const { data: participantId, error } = await sb.rpc("md_resolve_participant_id", {
      p_token_hash: hashSessionToken(sessionToken),
    });
    if (error || !participantId) return null;
    const { data, error: pError } = await sb.from("md_participants").select("*").eq("id", participantId).maybeSingle();
    if (pError || !data) return null;
    return mapParticipant(data as never);
  }

  async registerParticipant(input: RegistrationInput, sessionToken: string, isDemo = false) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const email = input.email.trim().toLowerCase();
    const { data: existing } = await sb
      .from("md_participants")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      const participant = mapParticipant(existing as never);
      await this.bindSession(sessionToken, participant.id);
      return { participant, recovered: true };
    }

    const t = new Date().toISOString();
    const { data: inserted, error } = await sb
      .from("md_participants")
      .insert({
        campaign_id: campaign.id,
        first_name: sanitizePlainText(input.firstName, 80),
        last_name: sanitizePlainText(input.lastName, 80),
        organization: sanitizePlainText(input.organization, 160),
        role: sanitizePlainText(input.role, 120),
        email,
        phone: input.phone?.trim() || null,
        marketing_consent: Boolean(input.marketingConsent),
        marketing_consent_at: input.marketingConsent ? t : null,
        marketing_consent_version: input.marketingConsent ? CONSENT_VERSION : null,
        is_demo: isDemo,
      })
      .select("*")
      .single();

    if (error || !inserted) throw new MahniStoreUnavailableError();
    const participant = mapParticipant(inserted as never);
    await this.bindSession(sessionToken, participant.id);
    await sb.rpc("md_audit", { p_campaign_id: campaign.id, p_action: "participant_registered", p_detail: { id: participant.id } });
    return { participant, recovered: false };
  }

  async recoverParticipantByEmail(email: string, sessionToken: string) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data } = await sb
      .from("md_participants")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (!data) return null;
    const participant = mapParticipant(data as never);
    await this.bindSession(sessionToken, participant.id);
    return participant;
  }

  async submitIdea(sessionToken: string, body: string, frequency: string | null, idempotencyKey?: string) {
    const campaign = await this.ensureCampaign();
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant || participant.campaignId !== campaign.id) throw new Error("unauthorized");
    if (campaign.paused) throw new Error("paused");
    if (!ideasAllowed(campaign.phase)) throw new Error("not_collecting");
    const scope = idempotencyKey ? `idea:${participant.id}:${idempotencyKey}` : "";
    const sb = client();
    const { data, error } = await sb.rpc("md_submit_idea", {
      p_token_hash: hashSessionToken(sessionToken),
      p_body: body,
      p_frequency: frequency ?? "",
      p_idempotency_scope: scope,
    });
    if (error) throwMapped(error);
    const payload = data as { idea_id: string; duplicate: boolean };
    const { data: row, error: loadError } = await sb.from("md_ideas").select("*").eq("id", payload.idea_id).single();
    if (loadError || !row) throw new MahniStoreUnavailableError();
    return { idea: mapIdea(row), duplicate: Boolean(payload.duplicate) };
  }

  async listParticipantIdeas(sessionToken: string) {
    const campaign = await this.ensureCampaign();
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant || participant.campaignId !== campaign.id) return [];
    const sb = client();
    const { data, error } = await sb
      .from("md_ideas")
      .select("*")
      .eq("participant_id", participant.id)
      .order("created_at", { ascending: true });
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((row) => mapIdea(row));
  }

  private async assertThemeInCampaign(campaignId: string, themeId: string) {
    const sb = client();
    const { data, error } = await sb.from("md_themes").select("id").eq("id", themeId).eq("campaign_id", campaignId).maybeSingle();
    if (error) throw new MahniStoreUnavailableError();
    if (!data) throw new Error("invalid_theme");
  }

  private async assertVotingTheme(campaignId: string, themeId: string) {
    const theme = (await this.listThemes()).find((item) => item.id === themeId && item.campaignId === campaignId);
    if (!theme || !isVotingTheme(theme)) throw new Error("invalid_theme");
  }

  async castVote(sessionToken: string, themeId: string, idempotencyKey?: string) {
    const campaign = await this.ensureCampaign();
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant || participant.campaignId !== campaign.id) throw new Error("unauthorized");
    if (campaign.paused) throw new Error("paused");
    await this.assertVotingTheme(campaign.id, themeId);
    const scope = idempotencyKey ? `vote:${participant.id}:${idempotencyKey}` : "";
    const sb = client();
    const { data, error } = await sb.rpc("md_cast_vote", {
      p_token_hash: hashSessionToken(sessionToken),
      p_theme_id: themeId,
      p_idempotency_scope: scope,
    });
    if (error) throwMapped(error);
    const payload = data as { vote_id: string; votes_used: number; duplicate: boolean };
    const { data: row } = await sb.from("md_votes").select("*").eq("id", payload.vote_id).single();
    if (!row) throw new MahniStoreUnavailableError();
    return {
      vote: mapVote(row),
      votesUsed: payload.votes_used,
      duplicate: Boolean(payload.duplicate),
    };
  }

  async setInterest(sessionToken: string, themeId: string) {
    const campaign = await this.ensureCampaign();
    if (!interestAllowed(campaign.phase)) throw new Error("not_allowed");
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant || participant.campaignId !== campaign.id) throw new Error("unauthorized");
    await this.assertThemeInCampaign(campaign.id, themeId);
    const sb = client();
    const { error } = await sb.from("md_interest_signals").upsert(
      {
        campaign_id: campaign.id,
        participant_id: participant.id,
        theme_id: themeId,
        organization: participant.organization,
      },
      { onConflict: "participant_id,theme_id", ignoreDuplicates: true },
    );
    if (error) throw new MahniStoreUnavailableError();
    return { active: true };
  }

  async requestFollowup(sessionToken: string, themeId: string) {
    const campaign = await this.ensureCampaign();
    if (!followupAllowed(campaign.phase)) throw new Error("not_allowed");
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant || participant.campaignId !== campaign.id) throw new Error("unauthorized");
    await this.assertThemeInCampaign(campaign.id, themeId);
    const sb = client();
    const { data, error } = await sb
      .from("md_followup_requests")
      .insert({
        campaign_id: campaign.id,
        participant_id: participant.id,
        organization: participant.organization,
        theme_id: themeId,
      })
      .select("*")
      .single();
    if (error || !data) throw new MahniStoreUnavailableError();
    return mapFollowup(data);
  }

  async getParticipantContext(sessionToken: string | null): Promise<ParticipantContext> {
    if (!sessionToken) {
      return { participant: null, ideaCount: 0, votesUsed: 0, votedThemeIds: [], interestThemeIds: [], followupThemeIds: [] };
    }
    const participant = await this.resolveParticipant(sessionToken);
    const campaign = await this.ensureCampaign();
    if (!participant || participant.campaignId !== campaign.id) {
      return { participant: null, ideaCount: 0, votesUsed: 0, votedThemeIds: [], interestThemeIds: [], followupThemeIds: [] };
    }
    const sb = client();
    const [{ count: ideaCount }, { data: voteRows }, { data: interests }, { data: followups }] = await Promise.all([
      sb.from("md_ideas").select("*", { count: "exact", head: true }).eq("participant_id", participant.id),
      sb.from("md_votes").select("theme_id").eq("participant_id", participant.id),
      sb.from("md_interest_signals").select("theme_id").eq("participant_id", participant.id),
      sb.from("md_followup_requests").select("theme_id").eq("participant_id", participant.id),
    ]);
    const votedThemeIds = (voteRows ?? []).map((row) => String(row.theme_id));
    return {
      participant,
      ideaCount: ideaCount ?? 0,
      votesUsed: votedThemeIds.length,
      votedThemeIds,
      interestThemeIds: (interests ?? []).map((row) => String(row.theme_id)),
      followupThemeIds: (followups ?? []).map((row) => String(row.theme_id)),
    };
  }

  async getPublicLiveSnapshot(): Promise<PublicLiveSnapshot> {
    const campaign = await this.ensureCampaign();
    const sb = client();

    const [{ count: participants }, { count: ideas }, { count: votes }, { data: ideaRows }, { data: themeRows }, { data: voteRows }, { data: interestRows }] =
      await Promise.all([
        sb.from("md_participants").select("*", { count: "exact", head: true }).eq("campaign_id", campaign.id),
        sb.from("md_ideas").select("*", { count: "exact", head: true }).eq("campaign_id", campaign.id),
        sb.from("md_votes").select("*", { count: "exact", head: true }).eq("campaign_id", campaign.id),
        sb.from("md_ideas").select("body, created_at").eq("campaign_id", campaign.id).order("created_at", { ascending: false }).limit(8),
        sb.from("md_themes").select("*").eq("campaign_id", campaign.id).order("sort_order"),
        sb.from("md_votes").select("theme_id").eq("campaign_id", campaign.id),
        sb.from("md_interest_signals").select("theme_id, organization").eq("campaign_id", campaign.id),
      ]);

    const { data: orgRows } = await sb.from("md_participants").select("organization").eq("campaign_id", campaign.id);
    const organizations = new Set((orgRows ?? []).map((r) => normalizeOrg(String(r.organization))));

    const voteCounts = new Map<string, number>();
    for (const v of voteRows ?? []) {
      const id = String(v.theme_id);
      voteCounts.set(id, (voteCounts.get(id) ?? 0) + 1);
    }

    const themes = await this.withAuditReviews(campaign.id, (themeRows ?? []).map((row) => mapTheme(row)));
    const interestByTheme = new Map<string, Set<string>>();
    for (const sig of interestRows ?? []) {
      const tid = String(sig.theme_id);
      if (!interestByTheme.has(tid)) interestByTheme.set(tid, new Set());
      interestByTheme.get(tid)!.add(normalizeOrg(String(sig.organization)));
    }

    const ballot = themes.filter(isVotingTheme);
    const ranked = rankHumanThemes(
      ballot.map((theme) => ({
        theme,
        voteCount: voteCounts.get(theme.id) ?? 0,
        interestOrgCount: interestByTheme.get(theme.id)?.size ?? 0,
        submissionOrgCount: theme.organizationCount,
      })),
    );

    const juryRuns = await this.listJuryResults();
    const juryProgress = summarizeJuryProgress(juryRuns);
    const juryPicks = juryRuns.flatMap((run) => run.picks.map((p) => ({ themeId: p.themeId, rank: p.rank })));
    const aiAgg = aggregateAiJury(juryPicks, ballot);

    let countdownSeconds: number | null = null;
    if (campaign.phase === "FINALIZING" && campaign.votingEndsAt) {
      countdownSeconds = Math.max(0, Math.ceil((Date.parse(campaign.votingEndsAt) - Date.now()) / 1000));
    }

    const showThemes =
      ["VOTING", "FINALIZING", "RESULTS", "CLOSED"].includes(campaign.phase) ||
      (campaign.phase === "ANALYZING" && votingTransitionAllowed(themes).ok);
    const showResults = campaign.phase === "RESULTS" || campaign.phase === "CLOSED";

    const { data: latestRun } = await sb
      .from("md_analysis_runs")
      .select("stage")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      phase: campaign.phase,
      paused: campaign.paused === true,
      title: campaign.title,
      showRecentIdeas: campaign.showRecentIdeas,
      stats: {
        participants: participants ?? 0,
        organizations: organizations.size,
        ideas: ideas ?? 0,
        votes: votes ?? 0,
      },
      recentIdeas:
        campaign.showRecentIdeas && campaign.phase === "COLLECTING"
          ? (ideaRows ?? []).map((r) => ({ body: publicExcerpt(String(r.body), { max: 180 }), createdAt: String(r.created_at) }))
          : [],
      analysisStage: campaign.phase === "ANALYZING" ? (latestRun?.stage ? String(latestRun.stage) : "reading") : null,
      themes: showThemes
        ? ballot.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            isAiWildcard: t.isAiWildcard,
            voteCount: voteCounts.get(t.id) ?? 0,
            ideaCount: t.ideaCount,
            organizationCount: t.organizationCount,
          }))
        : [],
      votingEndsAt: campaign.votingEndsAt,
      countdownSeconds,
      humanTop3: showResults
        ? ranked.slice(0, 3).map((r, idx) => ({ rank: idx + 1, id: r.theme.id, title: r.theme.title, isAiWildcard: r.theme.isAiWildcard }))
        : [],
      aiTop3: showResults
        ? aiAgg.slice(0, 3).map((r, idx) => ({ rank: idx + 1, id: r.theme.id, title: r.theme.title, isAiWildcard: r.theme.isAiWildcard }))
        : [],
      overlap: showResults
        ? overlapCount(
            ranked.slice(0, 3).map((r) => r.theme.id),
            aiAgg.slice(0, 3).map((r) => r.themeId),
          )
        : null,
      groupedThemeCount: themes.filter((theme) => !theme.isAiWildcard).length,
      wildcardCount: themes.filter((theme) => theme.isAiWildcard).length,
      juryReady: campaign.phase === "AI_JURY" ? juryProgress.succeeded : null,
      juryTotal: campaign.phase === "AI_JURY" ? juryProgress.total : null,
      juryLenses: publicJuryLenses(campaign.phase, juryProgress),
      review: campaign.phase === "ANALYZING" ? currentPublicReview(await this.listThemes(), await this.listIdeasAdmin()) : null,
    };
  }

  async transitionPhase(to: EventPhase, options?: { votingEndsAt?: string | null }) {
    const campaign = await this.ensureCampaign();
    assertTransition(campaign.phase, to);
    if (to === "RESULTS") {
      const runs = await this.listJuryResults();
      assertJuryCompleteForResults(summarizeJuryProgress(runs));
    }
    if (to === "VOTING") {
      const ready = votingTransitionAllowed(await this.listThemes());
      if (!ready.ok) throw new Error(ready.reason);
    }
    if (campaign.phase === to && !options) return campaign;

    const sb = client();
    let votingEnds = options?.votingEndsAt;
    if (to === "FINALIZING" && !votingEnds && !campaign.votingEndsAt) {
      votingEnds = new Date(Date.now() + 45_000).toISOString();
    }

    const { data, error } = await sb.rpc("md_transition_phase", {
      p_slug: this.campaignSlug,
      p_to: to,
      p_voting_ends_at: votingEnds ?? null,
    });
    if (error) throwMapped(error);
    this.campaignCache = mapCampaign(data as never);
    return this.campaignCache;
  }

  private async patchCampaign(patch: Record<string, unknown>, allowMissingPause = false) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const write = async (body: Record<string, unknown>) =>
      sb.from("md_event_campaigns").update({ ...body, updated_at: new Date().toISOString() }).eq("id", campaign.id).select("*").single();
    let result = await write(patch);
    if (result.error && allowMissingPause && String(result.error.message).includes("paused")) {
      const rest = { ...patch };
      delete rest.paused;
      result = await write(rest);
    }
    if (result.error || !result.data) {
      if (String(result.error?.message ?? "").includes("paused")) throw new Error("pause_unavailable");
      throw new MahniStoreUnavailableError(result.error?.message);
    }
    this.campaignCache = mapCampaign(result.data as never);
    return this.campaignCache;
  }

  async setEventPaused(paused: boolean) {
    const campaign = await this.ensureCampaign();
    await this.writeOperatorPause(campaign.id, paused);
    this.campaignCache = { ...campaign, paused };
    return this.campaignCache;
  }

  async reopenCollection() {
    const campaign = await this.patchCampaign({ phase: "COLLECTING", voting_ends_at: null }, true);
    await this.writeOperatorPause(campaign.id, false);
    this.campaignCache = { ...campaign, paused: false };
    return this.campaignCache;
  }

  async stopEvent() {
    const campaign = await this.patchCampaign({ phase: "CLOSED" }, true);
    await this.writeOperatorPause(campaign.id, false);
    this.campaignCache = { ...campaign, paused: false };
    return this.campaignCache;
  }

  async restartEvent(options: { isDemo: boolean }) {
    const current = await this.ensureCampaign();
    await this.writeOperatorPause(current.id, false);
    await this.patchCampaign({ phase: "CLOSED" }, true);
    return this.prepareNextCampaign(options);
  }

  async setShowRecentIdeas(show: boolean) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb
      .from("md_event_campaigns")
      .update({ show_recent_ideas: show, updated_at: new Date().toISOString() })
      .eq("id", campaign.id)
      .select("*")
      .single();
    if (error || !data) throw new MahniStoreUnavailableError();
    this.campaignCache = mapCampaign(data as never);
    return this.campaignCache;
  }

  async lockHumanResult() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb
      .from("md_event_campaigns")
      .update({ human_result_locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", campaign.id)
      .select("*")
      .single();
    if (error || !data) throw new MahniStoreUnavailableError();
    this.campaignCache = mapCampaign(data as never);
    return this.campaignCache;
  }

  async startAnalysisRun() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb
      .from("md_analysis_runs")
      .insert({ campaign_id: campaign.id, status: "running", stage: "reading", started_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error || !data) throw new MahniStoreUnavailableError();
    return mapAnalysisRun(data);
  }

  async completeAnalysisRun(
    runId: string,
    output: ClusteringOutput,
    meta: { provider: string; model: string },
    reviews?: Array<{ reviewStatus: ThemeReviewStatus; audit: ThemeAuditRecord | null }>,
  ) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data: ideas } = await sb.from("md_ideas").select("id, body").eq("campaign_id", campaign.id);
    const ideaRows = (ideas ?? []).map((idea) => ({ id: String(idea.id), body: String(idea.body ?? "") }));
    const ideaIds = new Set(ideaRows.map((idea) => idea.id));
    const valid = validateClusteringAgainstIdeas(output, ideaIds);
    if (!valid.ok) throw new Error(valid.reason);

    const themesPayload = output.themes.map((theme, index) => ({
      ...clusteringCommitTheme(theme, ideaRows),
      reviewStatus: reviews?.[index]?.reviewStatus ?? "review_ready",
      audit: reviews?.[index]?.audit ?? null,
    }));

    const { error } = await sb.rpc("md_commit_clustering", {
      p_run_id: runId,
      p_provider: meta.provider,
      p_model: meta.model,
      p_themes: themesPayload,
      p_wildcard: clusteringCommitWildcard(output.wildcard),
    });
    if (error) throw new MahniStoreUnavailableError(error.message);
  }

  async failAnalysisRun(runId: string, code: string, message: string) {
    const sb = client();
    await sb
      .from("md_analysis_runs")
      .update({ status: "failed", error_code: code, error_message: message, stage: "failed", finished_at: new Date().toISOString() })
      .eq("id", runId);
  }

  async getAnalysisProgress() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data } = await sb
      .from("md_analysis_runs")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { stage: data?.stage ? String(data.stage) : "idle", run: data ? mapAnalysisRun(data) : null };
  }

  async startJuryRun(judge: JudgeType) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb
      .from("md_ai_jury_runs")
      .upsert(
        {
          campaign_id: campaign.id,
          judge_type: judge,
          status: "running",
          started_at: new Date().toISOString(),
          finished_at: null,
          provider: null,
          model: null,
          error_code: null,
          error_message: null,
        },
        { onConflict: "campaign_id,judge_type" },
      )
      .select("*")
      .single();
    if (error || !data) throw new MahniStoreUnavailableError();
    return mapJuryRun(data);
  }

  async completeJuryRun(runId: string, output: JuryOutput, meta: { provider: string; model: string }) {
    const sb = client();
    await sb.from("md_ai_jury_votes").delete().eq("jury_run_id", runId);
    const rows = output.picks.map((pick) => ({
      jury_run_id: runId,
      theme_id: pick.themeId,
      rank: pick.rank,
      rationale: pick.rationale,
    }));
    const { error: insertError } = await sb.from("md_ai_jury_votes").insert(rows);
    if (insertError) throw new MahniStoreUnavailableError();
    await sb
      .from("md_ai_jury_runs")
      .update({ status: "succeeded", provider: meta.provider, model: meta.model, finished_at: new Date().toISOString() })
      .eq("id", runId);
  }

  async failJuryRun(runId: string, code: string, message: string) {
    const sb = client();
    await sb
      .from("md_ai_jury_runs")
      .update({ status: "failed", error_code: code, error_message: message, finished_at: new Date().toISOString() })
      .eq("id", runId);
  }

  async listThemes() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb.from("md_themes").select("*").eq("campaign_id", campaign.id).order("sort_order");
    if (error) throw new MahniStoreUnavailableError();
    const themes = (data ?? []).map((row) => mapTheme(row));
    return this.withAuditReviews(campaign.id, await hydrateStoredThemes(sb, themes));
  }

  private async withAuditReviews(campaignId: string, themes: Theme[]): Promise<Theme[]> {
    const sb = client();
    const { data, error } = await sb
      .from("md_event_audit_log")
      .select("detail")
      .eq("campaign_id", campaignId)
      .eq("action", "theme_review")
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) return themes;
    const statusByTheme = new Map<string, ThemeReviewStatus>();
    for (const row of data) {
      const detail = row.detail as { themeId?: unknown; status?: unknown } | null;
      if (!detail || typeof detail.themeId !== "string" || !isThemeReviewStatus(detail.status)) continue;
      statusByTheme.set(detail.themeId, detail.status);
    }
    if (statusByTheme.size === 0) return themes;
    return themes.map((theme) => {
      const status = statusByTheme.get(theme.id);
      return status ? { ...theme, reviewStatus: status } : theme;
    });
  }

  async listThemeIdeaLinks(themeId: string) {
    const sb = client();
    const { data, error } = await sb.from("md_theme_idea_links").select("idea_id").eq("theme_id", themeId);
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((r) => String(r.idea_id));
  }

  async extractReviewIdeas(themeId: string, ideaIds: string[]) {
    const { campaignId, drafts } = await this.reviewDrafts();
    const planned = extractSources(drafts, themeId, ideaIds, ideaIds.map(() => randomUUID()));
    await persistReviewDrafts(campaignId, drafts.map((theme) => theme.id), planned.themes);
    return { openedId: planned.openedId };
  }

  async mergeReviewThemes(themeIds: string[], result: { title: string; description: string; formulationNote: string }) {
    const { campaignId, drafts } = await this.reviewDrafts();
    const planned = mergeDrafts(drafts, themeIds, result, randomUUID());
    await persistReviewDrafts(campaignId, drafts.map((theme) => theme.id), planned.themes);
    return { openedId: planned.openedId };
  }

  private async setThemeReview(themeId: string, status: ThemeReviewStatus, override: { actorEmail: string; reason: string; at: string } | null) {
    const campaign = await this.ensureCampaign();
    if (campaign.phase !== "ANALYZING") throw new Error("not_analyzing");
    const sb = client();
    const { error } = await sb.rpc("md_set_theme_review", {
      p_theme_id: themeId,
      p_campaign_id: campaign.id,
      p_status: status,
      p_override: override,
    });
    if (!error) return;
    const missing = error.code === "PGRST202" || (error.message ?? "").includes("md_set_theme_review");
    if (!missing) throwMapped(error);
    const { error: auditError } = await sb.rpc("md_audit", {
      p_campaign_id: campaign.id,
      p_action: "theme_review",
      p_detail: { themeId, status, override },
    });
    if (auditError) throw new MahniStoreUnavailableError(auditError.message);
  }

  async approveAudienceTheme(themeId: string) {
    const theme = (await this.listThemes()).find((item) => item.id === themeId);
    if (!theme || theme.isAiWildcard || (theme.reviewStatus !== "review_ready" && theme.reviewStatus !== "pending" && theme.reviewStatus !== "rework")) throw new Error(theme ? "not_review_ready" : "invalid_theme");
    await this.setThemeReview(themeId, "approved", null);
  }

  async recordAuditOverride(themeId: string, actorEmail: string, reason: string) {
    const theme = (await this.listThemes()).find((item) => item.id === themeId);
    if (!theme || theme.isAiWildcard) throw new Error("invalid_theme");
    if (theme.reviewStatus !== "audit_unavailable") throw new Error("not_override");
    const clean = reason.trim();
    if (clean.length < 8) throw new Error("override_reason");
    await this.setThemeReview(themeId, "review_ready", { actorEmail, reason: clean.slice(0, 400), at: new Date().toISOString() });
  }

  async markThemeRework(themeId: string) {
    const theme = (await this.listThemes()).find((item) => item.id === themeId);
    if (!theme || theme.isAiWildcard) throw new Error("invalid_theme");
    if (theme.reviewStatus !== "review_ready" && theme.reviewStatus !== "rework") throw new Error("not_review_ready");
    await this.setThemeReview(themeId, "rework", theme.auditOverride ?? null);
  }

  async reopenThemeReview(themeId: string) {
    const theme = (await this.listThemes()).find((item) => item.id === themeId);
    if (!theme || theme.isAiWildcard || theme.reviewStatus !== "rework") return;
    await this.setThemeReview(themeId, "review_ready", theme.auditOverride ?? null);
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
    const { campaignId, drafts } = await this.reviewDrafts();
    const theme = drafts.find((item) => item.id === themeId && !item.isAiWildcard);
    if (!theme) throw new Error("invalid_theme");
    const existing = theme.sources.map((source) => source.id);
    const nextIds = replacements.flatMap((item) => item.ideaIds);
    if (nextIds.length !== existing.length || new Set(nextIds).size !== nextIds.length || nextIds.some((id) => !existing.includes(id))) {
      throw new Error("invalid_theme");
    }
    const ideas = await this.listIdeasAdmin();
    const ideaById = new Map(ideas.map((idea) => [idea.id, idea]));
    const created = replacements.map((item, index) => ({
      id: randomUUID(),
      analysisRunId: theme.analysisRunId,
      title: item.title,
      description: item.description,
      formulationNote: item.formulationNote,
      isAiWildcard: false,
      sortOrder: theme.sortOrder + index,
      reviewStatus: item.reviewStatus,
      sources: item.ideaIds.map((id) => ({
        id,
        body: ideaById.get(id)?.body ?? "",
        organization: ideaById.get(id)?.organization ?? "",
      })),
    }));
    const rest = drafts.filter((item) => item.id !== themeId);
    await persistReviewDrafts(campaignId, drafts.map((item) => item.id), [...rest, ...created].map((item, index) => ({ ...item, sortOrder: index })));
  }

  private async reviewDrafts(): Promise<{ campaignId: string; drafts: ReviewDraft[] }> {
    const campaign = await this.ensureCampaign();
    if (campaign.phase !== "ANALYZING") throw new Error("not_analyzing");
    const [themes, ideas] = await Promise.all([this.listThemes(), this.listIdeasAdmin()]);
    return { campaignId: campaign.id, drafts: draftsFromThemes(themes, ideas) };
  }

  async listIdeasAdmin() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb.from("md_ideas").select("*").eq("campaign_id", campaign.id).order("created_at", { ascending: false });
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((row) => mapIdea(row));
  }

  async listParticipantsAdmin() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data: participants, error } = await sb.from("md_participants").select("*").eq("campaign_id", campaign.id).order("created_at");
    if (error) throw new MahniStoreUnavailableError();
    const { data: ideaCounts } = await sb.from("md_ideas").select("participant_id").eq("campaign_id", campaign.id);
    const { data: followCounts } = await sb.from("md_followup_requests").select("participant_id").eq("campaign_id", campaign.id);
    const ideasBy = new Map<string, number>();
    const followBy = new Map<string, number>();
    for (const row of ideaCounts ?? []) ideasBy.set(String(row.participant_id), (ideasBy.get(String(row.participant_id)) ?? 0) + 1);
    for (const row of followCounts ?? []) followBy.set(String(row.participant_id), (followBy.get(String(row.participant_id)) ?? 0) + 1);
    return (participants ?? []).map((row) => ({
      ...mapParticipant(row as never),
      ideaCount: ideasBy.get(String(row.id)) ?? 0,
      followupCount: followBy.get(String(row.id)) ?? 0,
    }));
  }

  async listVotesAdmin() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb.from("md_votes").select("*").eq("campaign_id", campaign.id);
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((row) => mapVote(row));
  }

  async listFollowupsAdmin() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb.from("md_followup_requests").select("*").eq("campaign_id", campaign.id);
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((row) => mapFollowup(row));
  }

  async listJuryResults() {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data: runs, error } = await sb.from("md_ai_jury_runs").select("*").eq("campaign_id", campaign.id);
    if (error) throw new MahniStoreUnavailableError();
    const results: Array<AiJuryRun & { picks: import("../../types").AiJuryVote[] }> = [];
    for (const run of runs ?? []) {
      const mapped = mapJuryRun(run);
      const { data: picks } = await sb.from("md_ai_jury_votes").select("*").eq("jury_run_id", mapped.id);
      results.push({ ...mapped, picks: (picks ?? []).map((p) => mapJuryVote(p)) });
    }
    return results;
  }

  async listAnalysisRunsAdmin(): Promise<AnalysisRun[]> {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data, error } = await sb.from("md_analysis_runs").select("*").eq("campaign_id", campaign.id).order("created_at", { ascending: false });
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((row) => mapAnalysisRun(row));
  }

  async exportCsv() {
    const participants = await this.listParticipantsAdmin();
    const ideas = await this.listIdeasAdmin();
    const lines = ["type,id,createdAt,detail"];
    for (const p of participants) lines.push(`participant,${p.id},${p.createdAt},"${p.firstName} ${p.lastName}"`);
    for (const i of ideas) lines.push(`idea,${i.id},${i.createdAt},"${i.body.replace(/"/g, '""')}"`);
    return lines.join("\n");
  }

  async seedDemo(options: { participants: number; ideas: number }) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    await sb.from("md_event_campaigns").update({ is_demo: true, phase: "COLLECTING" }).eq("id", campaign.id);
    this.campaignCache = null;
    const orgs = ["ВиК София", "Aquanet Plovdiv", "HydroService", "InfraPro", "PipeTech"];
    for (let i = 0; i < options.participants; i++) {
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
        `demo-seed-${i}`,
        true,
      );
    }
    for (let n = 0; n < options.ideas; n++) {
      await this.submitIdea(`demo-seed-${n % options.participants}`, `Демо проблем ${n + 1}`, "Всяка седмица", `demo-idea-${n}`);
    }
  }

  async resetDemoOnly() {
    const campaign = await this.ensureCampaign();
    if (!campaign.isDemo) throw new Error("not_demo");
    const sb = client();
    await sb.from("md_event_campaigns").update({ phase: "DRAFT", is_demo: false }).eq("id", campaign.id);
    await sb.from("md_participants").delete().eq("campaign_id", campaign.id).eq("is_demo", true);
    this.campaignCache = null;
  }
}
