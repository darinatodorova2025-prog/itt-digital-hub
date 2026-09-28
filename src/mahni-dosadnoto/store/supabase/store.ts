import "server-only";

import { createSupabaseServiceClient } from "@/lib/cms/supabase-service";
import { hashSessionToken } from "../../session-crypto";
import {
  CAMPAIGN_SLUG,
  CONSENT_VERSION,
  type AiJuryRun,
  type AnalysisRun,
  type EventCampaign,
  type EventPhase,
  type JudgeType,
  type Participant,
} from "../../types";
import {
  assertTransition,
  followupAllowed,
  interestAllowed,
} from "../../state-machine";
import type { ClusteringOutput, JuryOutput, RegistrationInput } from "../../validation";
import { validateClusteringAgainstIdeas } from "../../validation";
import { aggregateAiJury, overlapCount, rankHumanThemes } from "../../tie-break";
import { assertJuryCompleteForResults, publicJuryLenses, summarizeJuryProgress } from "../../jury-status";
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

function throwMapped(error: { message?: string; code?: string }): never {
  const code = mapPostgresError(error);
  throw new Error(code);
}

export class SupabaseMahniStore implements MahniStore {
  private campaignCache: EventCampaign | null = null;

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
    await sb.rpc("md_maybe_advance_finalizing", { p_campaign_id: data.id });
    const { data: refreshed } = await sb.from("md_event_campaigns").select("*").eq("id", data.id).single();
    this.campaignCache = mapCampaign((refreshed ?? data) as never);
    return this.campaignCache;
  }

  async ensureCampaign(): Promise<EventCampaign> {
    return this.loadCampaignRow();
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
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant) throw new Error("unauthorized");
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
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant) return [];
    const sb = client();
    const { data, error } = await sb
      .from("md_ideas")
      .select("*")
      .eq("participant_id", participant.id)
      .order("created_at", { ascending: true });
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((row) => mapIdea(row));
  }

  async castVote(sessionToken: string, themeId: string, idempotencyKey?: string) {
    const participant = await this.resolveParticipant(sessionToken);
    if (!participant) throw new Error("unauthorized");
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

    const themes = (themeRows ?? []).map((row) => mapTheme(row));
    const interestByTheme = new Map<string, Set<string>>();
    for (const sig of interestRows ?? []) {
      const tid = String(sig.theme_id);
      if (!interestByTheme.has(tid)) interestByTheme.set(tid, new Set());
      interestByTheme.get(tid)!.add(normalizeOrg(String(sig.organization)));
    }

    const ranked = rankHumanThemes(
      themes.map((theme) => ({
        theme,
        voteCount: voteCounts.get(theme.id) ?? 0,
        interestOrgCount: interestByTheme.get(theme.id)?.size ?? 0,
        submissionOrgCount: theme.organizationCount,
      })),
    );

    const juryRuns = await this.listJuryResults();
    const juryProgress = summarizeJuryProgress(juryRuns);
    const juryPicks = juryRuns.flatMap((run) => run.picks.map((p) => ({ themeId: p.themeId, rank: p.rank })));
    const aiAgg = aggregateAiJury(juryPicks, themes);

    let countdownSeconds: number | null = null;
    if (campaign.phase === "FINALIZING" && campaign.votingEndsAt) {
      countdownSeconds = Math.max(0, Math.ceil((Date.parse(campaign.votingEndsAt) - Date.now()) / 1000));
    }

    const showThemes = ["VOTING", "FINALIZING", "RESULTS", "CLOSED"].includes(campaign.phase);
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
          ? (ideaRows ?? []).map((r) => ({ body: String(r.body), createdAt: String(r.created_at) }))
          : [],
      analysisStage: campaign.phase === "ANALYZING" ? (latestRun?.stage ? String(latestRun.stage) : "reading") : null,
      themes: showThemes
        ? themes.map((t) => ({
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
    };
  }

  async transitionPhase(to: EventPhase, options?: { votingEndsAt?: string | null }) {
    const campaign = await this.ensureCampaign();
    assertTransition(campaign.phase, to);
    if (to === "RESULTS") {
      const runs = await this.listJuryResults();
      assertJuryCompleteForResults(summarizeJuryProgress(runs));
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

  async completeAnalysisRun(runId: string, output: ClusteringOutput, meta: { provider: string; model: string }) {
    const campaign = await this.ensureCampaign();
    const sb = client();
    const { data: ideas } = await sb.from("md_ideas").select("id").eq("campaign_id", campaign.id);
    const ideaIds = new Set((ideas ?? []).map((i) => String(i.id)));
    const valid = validateClusteringAgainstIdeas(output, ideaIds);
    if (!valid.ok) throw new Error(valid.reason);

    const themesPayload = output.themes.map((theme) => ({
      title: theme.title,
      description: theme.description,
      ideaIds: theme.ideaIds,
    }));

    const { error } = await sb.rpc("md_commit_clustering", {
      p_run_id: runId,
      p_provider: meta.provider,
      p_model: meta.model,
      p_themes: themesPayload,
      p_wildcard: output.wildcard,
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
        { campaign_id: campaign.id, judge_type: judge, status: "running", started_at: new Date().toISOString(), error_code: null, error_message: null },
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
    return (data ?? []).map((row) => mapTheme(row));
  }

  async listThemeIdeaLinks(themeId: string) {
    const sb = client();
    const { data, error } = await sb.from("md_theme_idea_links").select("idea_id").eq("theme_id", themeId);
    if (error) throw new MahniStoreUnavailableError();
    return (data ?? []).map((r) => String(r.idea_id));
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
