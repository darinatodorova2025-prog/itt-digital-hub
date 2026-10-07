import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { createSupabaseServiceClient } from "@/lib/cms/supabase-service"
import {
  applyBegin,
  applyClientEvent,
  applyFinish,
  applySurvey,
  applyTouch,
  emptyMemory,
  projectVisitor,
  type BetaMemory,
  type EventRecord,
  type LeadRecord,
  type RunRecord,
  type SessionRecord,
  type SurveyRecord,
  type TouchInput,
  type VisitorRecord,
} from "@/settlement-analyzer/beta/engine"
import type { BetaSettings } from "@/settlement-analyzer/beta/config"
import type { StoredSurveyAnswers, SurveyAnswers } from "@/settlement-analyzer/beta/types"
import { TrialStoreUnavailableError, type BetaStore } from "./file-store"

type DbError = { code?: string; message?: string } | null

export function createSupabaseBetaStore(): BetaStore {
  return {
    async touch(input) {
      const graph = await loadResolved(input)
      const before = structuredClone(graph.memory)
      const { visitorId } = applyTouch(graph.memory, { ...input, visitorCookie: graph.visitorId, visitorHeader: null })
      await persist(before, graph.memory)
      return projectVisitor(graph.memory, visitorId, input.privileged)
    },
    async begin(input) {
      const graph = await loadResolved(input)
      const before = structuredClone(graph.memory)
      const touched = applyTouch(graph.memory, { ...input, visitorCookie: graph.visitorId, visitorHeader: null })
      const result = applyBegin(graph.memory, { ...input, visitorId: touched.visitorId, sessionId: touched.sessionId })
      const outcome = await persist(before, graph.memory)
      if (outcome.trialLimit) {
        await insertEvents(client(), [{
          id: randomUUID(),
          visitorId: touched.visitorId,
          sessionId: touched.sessionId,
          analysisRunId: null,
          leadId: null,
          eventName: "trial_limit_reached",
          metadata: { source: "database_guard" },
          createdAt: input.now,
        }, {
          id: randomUUID(),
          visitorId: touched.visitorId,
          sessionId: touched.sessionId,
          analysisRunId: null,
          leadId: null,
          eventName: "trial_limit_blocked_analysis",
          metadata: { settlementKey: input.settlementKey, source: "database_guard" },
          createdAt: input.now,
        }])
        const reloaded = await loadGraph(touched.visitorId)
        return {
          allowed: false,
          duplicate: false,
          reason: "trial_limit" as const,
          clientRunId: input.clientRunId,
          state: projectVisitor(reloaded, touched.visitorId, input.privileged),
        }
      }
      const stateMemory = outcome.lostFinish ? await loadGraph(touched.visitorId) : graph.memory
      const state = projectVisitor(stateMemory, touched.visitorId, input.privileged)
      return {
        allowed: result.allowed && !outcome.trialLimit,
        duplicate: result.duplicate || outcome.duplicateRun,
        reason: result.reason === "trial_limit" ? "trial_limit" : undefined,
        clientRunId: input.clientRunId,
        state,
      }
    },
    async finish(input) {
      const memory = await loadGraph(input.visitorId)
      const before = structuredClone(memory)
      const result = applyFinish(memory, input)
      const outcome = await persist(before, memory)
      const stateMemory = outcome.lostFinish ? await loadGraph(input.visitorId) : memory
      const state = projectVisitor(stateMemory, input.visitorId, input.privileged)
      if (outcome.lostFinish) {
        return { recorded: true, duplicate: true, promptFeedback: false, trialComplete: false, limitReached: state.limitReached, state }
      }
      return { ...result, state }
    },
    async survey(input) {
      const memory = await loadGraph(input.visitorId)
      const before = structuredClone(memory)
      const result = applySurvey(memory, input)
      await persist(before, memory)
      return {
        ok: result.ok,
        issues: "issues" in result ? result.issues : undefined,
        state: projectVisitor(memory, input.visitorId, input.privileged),
      }
    },
    async event(input) {
      const memory = await loadGraph(input.visitorId)
      const before = structuredClone(memory)
      applyClientEvent(memory, input)
      await persist(before, memory)
      return projectVisitor(memory, input.visitorId, input.privileged)
    },
  }
}

function client() {
  return createSupabaseServiceClient()
}

async function loadSettings(): Promise<BetaSettings> {
  const { data, error } = await client()
    .from("sa_beta_settings")
    .select("feedback_trigger_count, beta_trial_limit, survey_version")
    .eq("id", 1)
    .maybeSingle()
  if (error) throw asStoreError(error)
  const feedbackTriggerCount = positiveSetting(data?.feedback_trigger_count)
  const trialLimit = positiveSetting(data?.beta_trial_limit)
  const surveyVersion = positiveSetting(data?.survey_version)
  if (feedbackTriggerCount == null || trialLimit == null || surveyVersion == null) throw new TrialStoreUnavailableError()
  return { feedbackTriggerCount, trialLimit, surveyVersion }
}

function positiveSetting(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN
  return Number.isInteger(number) && number > 0 ? number : null
}

async function loadResolved(input: TouchInput & { visitorId?: string }) {
  const supabase = client()
  if (input.visitorId) {
    const { data, error } = await supabase.from("sa_beta_visitors").select("id").eq("id", input.visitorId).maybeSingle()
    if (error) throw asStoreError(error)
    if (data?.id) return { visitorId: String(data.id), memory: await loadGraph(String(data.id)) }
  }
  let visitorId: string | null = null
  if (input.authenticatedUserId) {
    const { data, error } = await supabase.from("sa_beta_visitors").select("id").eq("authenticated_user_id", input.authenticatedUserId).maybeSingle()
    if (error) throw asStoreError(error)
    if (data?.id) visitorId = String(data.id)
  }
  for (const candidate of [input.visitorCookie, input.visitorHeader]) {
    if (visitorId || !candidate) continue
    const { data, error } = await supabase.from("sa_beta_visitors").select("id").eq("id", candidate).maybeSingle()
    if (error) throw asStoreError(error)
    if (data?.id) visitorId = String(data.id)
  }
  return { visitorId, memory: await loadGraph(visitorId) }
}

async function loadGraph(visitorId: string | null): Promise<BetaMemory> {
  const memory = emptyMemory()
  memory.settings = await loadSettings()
  if (!visitorId) return memory
  const supabase = client()
  const [visitors, sessions, runs, events, surveys, leads] = await Promise.all([
    supabase.from("sa_beta_visitors").select("*").eq("id", visitorId).maybeSingle(),
    supabase.from("sa_beta_sessions").select("*").eq("visitor_id", visitorId),
    supabase.from("sa_beta_analysis_runs").select("*").eq("visitor_id", visitorId),
    supabase.from("sa_beta_events").select("*").eq("visitor_id", visitorId),
    supabase.from("sa_beta_survey_responses").select("*").eq("visitor_id", visitorId),
    supabase.from("sa_beta_leads").select("*").eq("visitor_id", visitorId),
  ])
  for (const result of [visitors, sessions, runs, events, surveys, leads]) {
    if (result.error) throw asStoreError(result.error)
  }
  if (visitors.data) memory.visitors.push(visitorFromRow(visitors.data))
  memory.sessions = (sessions.data ?? []).map(sessionFromRow)
  memory.runs = (runs.data ?? []).map(runFromRow)
  memory.events = (events.data ?? []).map(eventFromRow)
  memory.surveys = (surveys.data ?? []).map(surveyFromRow)
  memory.leads = (leads.data ?? []).map(leadFromRow)
  return memory
}

async function persist(before: BetaMemory, after: BetaMemory) {
  const supabase = client()
  let trialLimit = false
  let lostFinish = false
  let duplicateRun = false
  let wroteCompletion = false
  const writtenRunIds = new Set<string>()

  for (const visitor of after.visitors) {
    const { error } = await supabase.from("sa_beta_visitors").upsert(visitorToRow(visitor, after), { onConflict: "id" })
    if (error) throw asStoreError(error)
  }
  for (const session of after.sessions) {
    const { error } = await supabase.from("sa_beta_sessions").upsert(sessionToRow(session), { onConflict: "id" })
    if (error) throw asStoreError(error)
  }

  for (const run of after.runs) {
    const prev = before.runs.find((item) => item.id === run.id)
    if (!prev) {
      const { error } = await supabase.from("sa_beta_analysis_runs").insert(runToRow(run))
      if (error && isTrialLimit(error)) {
        trialLimit = true
        return { trialLimit, lostFinish, duplicateRun, wroteCompletion }
      }
      if (error && isUnique(error)) {
        duplicateRun = true
        continue
      }
      if (error) throw asStoreError(error)
      writtenRunIds.add(run.id)
      continue
    }
    if (sameJson(prev, run)) continue
    const { data, error } = await supabase
      .from("sa_beta_analysis_runs")
      .update(runToRow(run))
      .eq("id", run.id)
      .eq("status", prev.status)
      .select("id")
    if (error) throw asStoreError(error)
    if (!data?.length && run.status === "success" && prev.status === "started") lostFinish = true
    else writtenRunIds.add(run.id)
  }

  if (!trialLimit) {
    for (const survey of after.surveys) {
      const prev = before.surveys.find((item) => item.id === survey.id)
      if (prev?.status === "completed") continue
      if (!prev) {
        const { error } = await supabase.from("sa_beta_survey_responses").insert(surveyToRow(survey))
        if (error && isUnique(error)) continue
        if (error) throw asStoreError(error)
        if (survey.status === "completed") wroteCompletion = true
        continue
      }
      if (sameJson(prev, survey)) continue
      const query = supabase.from("sa_beta_survey_responses").update(surveyToRow(survey)).eq("id", survey.id)
      const { data, error } = await (survey.status === "completed" ? query.neq("status", "completed") : query).select("id")
      if (error) throw asStoreError(error)
      if (survey.status === "completed" && data?.length) wroteCompletion = true
    }

    for (const lead of after.leads) {
      const prev = before.leads.find((item) => item.id === lead.id)
      if (prev || !wroteCompletion && !before.leads.some((item) => item.visitorId === lead.visitorId)) {
        if (prev) continue
        if (!wroteCompletion) continue
      }
      const survey = after.surveys.find((item) => item.id === lead.surveyResponseId)
      const { error } = await supabase.from("sa_beta_leads").upsert(leadToRow(lead, survey), { onConflict: "visitor_id" })
      if (error && isUnique(error)) continue
      if (error) throw asStoreError(error)
    }

    const events = after.events.filter((event) => !before.events.some((item) => item.id === event.id))
    const kept = events.filter((event) => {
      if ((event.eventName === "analysis_succeeded" || event.eventName === "analysis_failed" || event.eventName === "analysis_started") && event.analysisRunId && !writtenRunIds.has(event.analysisRunId)) return false
      if (!wroteCompletion && ["survey_completed", "lead_interest_yes", "lead_interest_maybe", "lead_interest_no", "lead_submitted"].includes(event.eventName)) {
        const existed = before.surveys.some((item) => item.visitorId === event.visitorId && item.status === "completed")
        if (!existed) return false
      }
      return true
    })
    await insertEvents(supabase, kept)
  }

  return { trialLimit, lostFinish, duplicateRun, wroteCompletion }
}

async function insertEvents(supabase: SupabaseClient, events: EventRecord[]) {
  for (const event of events) {
    const { error } = await supabase.from("sa_beta_events").insert(eventToRow(event))
    if (error && isUnique(error) && event.eventName === "beta_page_view") continue
    if (error) throw asStoreError(error)
  }
}

function visitorToRow(visitor: VisitorRecord, memory: BetaMemory) {
  const projected = projectVisitor(memory, visitor.id, false)
  return {
    id: visitor.id,
    authenticated_user_id: visitor.authenticatedUserId,
    contact_id: visitor.contactId,
    survey_status: projected.surveyStatus,
    survey_version: visitor.surveyVersion,
    survey_impression_count: projected.surveyImpressionCount,
    survey_start_count: projected.surveyStartCount,
    survey_completion_count: projected.surveyCompletionCount,
    already_completed_claim_count: projected.alreadyCompletedClaimCount,
    survey_first_shown_at: visitor.surveyFirstShownAt,
    survey_started_at: visitor.surveyStartedAt,
    survey_completed_at: visitor.surveyCompletedAt,
    survey_duration_seconds: visitor.surveyDurationSeconds,
    survey_abandon_step: visitor.surveyAbandonStep,
    first_seen_at: visitor.firstSeenAt,
    last_seen_at: visitor.lastSeenAt,
    landing_page: visitor.landingPage,
    referrer: visitor.referrer,
    utm_source: visitor.utmSource,
    utm_medium: visitor.utmMedium,
    utm_campaign: visitor.utmCampaign,
    utm_content: visitor.utmContent,
    utm_term: visitor.utmTerm,
    locale: visitor.locale,
    language: visitor.language,
    timezone: visitor.timezone,
  }
}

function sessionToRow(session: SessionRecord) {
  return {
    id: session.id,
    visitor_id: session.visitorId,
    started_at: session.startedAt,
    last_seen_at: session.lastSeenAt,
    landing_page: session.landingPage,
    referrer: session.referrer,
    utm_source: session.utmSource,
    utm_medium: session.utmMedium,
    utm_campaign: session.utmCampaign,
    utm_content: session.utmContent,
    utm_term: session.utmTerm,
    locale: session.locale,
    language: session.language,
    timezone: session.timezone,
    device_category: session.deviceCategory,
    browser_family: session.browserFamily,
    os_family: session.osFamily,
    viewport_width: session.viewportWidth,
    viewport_height: session.viewportHeight,
    abuse_signal: session.abuseSignal,
    app_version: session.appVersion,
    analysis_engine_version: session.analysisEngineVersion,
  }
}

function runToRow(run: RunRecord) {
  return {
    id: run.id,
    visitor_id: run.visitorId,
    session_id: run.sessionId,
    client_run_id: run.clientRunId,
    status: run.status,
    counts_toward_trial: run.countsTowardTrial,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    duration_ms: run.durationMs,
    error_code: run.errorCode,
    error_category: run.errorCategory,
    app_version: run.appVersion,
    analysis_engine_version: run.analysisEngineVersion,
    settlement_key: run.settlementKey,
    settlement_name: run.settlementName,
    municipality: run.municipality,
    region: run.region,
    area_km2: run.areaKm2,
    analysis_package: run.analysisPackage,
    layers: run.layers,
    options: run.options,
    config_fingerprint: run.configFingerprint,
    map_context: run.mapContext,
  }
}

function eventToRow(event: EventRecord) {
  return {
    id: event.id,
    visitor_id: event.visitorId,
    session_id: event.sessionId,
    analysis_run_id: event.analysisRunId,
    lead_id: event.leadId,
    event_name: event.eventName,
    metadata: event.metadata,
    created_at: event.createdAt,
  }
}

function surveyToRow(survey: SurveyRecord) {
  return {
    id: survey.id,
    visitor_id: survey.visitorId,
    session_id: survey.sessionId,
    survey_version: survey.surveyVersion,
    status: survey.status,
    answers: survey.answers,
    context_snapshot: survey.contextSnapshot,
    started_at: survey.startedAt,
    completed_at: survey.completedAt,
    duration_seconds: survey.durationSeconds,
    abandon_step: survey.abandonStep,
    app_version: survey.appVersion,
    analysis_engine_version: survey.analysisEngineVersion,
  }
}

function leadToRow(lead: LeadRecord, survey?: SurveyRecord) {
  return {
    id: lead.id,
    visitor_id: lead.visitorId,
    survey_response_id: lead.surveyResponseId,
    business_interest: lead.businessInterest,
    name: lead.name,
    organisation: lead.organisation,
    email: lead.email,
    phone: lead.phone,
    role: lead.role,
    organisation_work_frequency: lead.organisationWorkFrequency,
    usefulness_score: lead.usefulnessScore,
    intended_use_cases: lead.intendedUseCases,
    requested_capabilities: lead.requestedCapabilities,
    workflow_stages: lead.workflowStages,
    automation_need: lead.automationNeed,
    what_they_want_to_discuss: lead.whatTheyWantToDiscuss,
    acquisition_source: lead.acquisitionSource,
    utm_campaign: lead.utmCampaign,
    context_snapshot: survey?.contextSnapshot ?? {},
  }
}

function visitorFromRow(row: Record<string, unknown>): VisitorRecord {
  return {
    id: String(row.id),
    authenticatedUserId: text(row.authenticated_user_id),
    contactId: text(row.contact_id),
    surveyStatus: (text(row.survey_status) ?? "never_seen") as VisitorRecord["surveyStatus"],
    surveyVersion: numberOrNull(row.survey_version),
    surveyFirstShownAt: text(row.survey_first_shown_at),
    surveyStartedAt: text(row.survey_started_at),
    surveyCompletedAt: text(row.survey_completed_at),
    surveyDurationSeconds: numberOrNull(row.survey_duration_seconds),
    surveyAbandonStep: numberOrNull(row.survey_abandon_step),
    firstSeenAt: String(row.first_seen_at),
    lastSeenAt: String(row.last_seen_at),
    landingPage: text(row.landing_page),
    referrer: text(row.referrer),
    utmSource: text(row.utm_source),
    utmMedium: text(row.utm_medium),
    utmCampaign: text(row.utm_campaign),
    utmContent: text(row.utm_content),
    utmTerm: text(row.utm_term),
    locale: text(row.locale),
    language: text(row.language),
    timezone: text(row.timezone),
  }
}

function sessionFromRow(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    visitorId: String(row.visitor_id),
    startedAt: String(row.started_at),
    lastSeenAt: String(row.last_seen_at),
    landingPage: text(row.landing_page),
    referrer: text(row.referrer),
    utmSource: text(row.utm_source),
    utmMedium: text(row.utm_medium),
    utmCampaign: text(row.utm_campaign),
    utmContent: text(row.utm_content),
    utmTerm: text(row.utm_term),
    locale: text(row.locale),
    language: text(row.language),
    timezone: text(row.timezone),
    deviceCategory: text(row.device_category),
    browserFamily: text(row.browser_family),
    osFamily: text(row.os_family),
    viewportWidth: numberOrNull(row.viewport_width),
    viewportHeight: numberOrNull(row.viewport_height),
    abuseSignal: text(row.abuse_signal),
    appVersion: text(row.app_version) ?? "",
    analysisEngineVersion: text(row.analysis_engine_version) ?? "",
  }
}

function runFromRow(row: Record<string, unknown>): RunRecord {
  return {
    id: String(row.id),
    visitorId: String(row.visitor_id),
    sessionId: String(row.session_id),
    clientRunId: String(row.client_run_id),
    status: String(row.status) as RunRecord["status"],
    countsTowardTrial: Boolean(row.counts_toward_trial),
    startedAt: String(row.started_at),
    completedAt: text(row.completed_at),
    durationMs: numberOrNull(row.duration_ms),
    errorCode: text(row.error_code),
    errorCategory: text(row.error_category),
    appVersion: text(row.app_version) ?? "",
    analysisEngineVersion: text(row.analysis_engine_version) ?? "",
    settlementKey: text(row.settlement_key),
    settlementName: text(row.settlement_name),
    municipality: text(row.municipality),
    region: text(row.region),
    areaKm2: numberOrNull(row.area_km2),
    analysisPackage: text(row.analysis_package),
    layers: Array.isArray(row.layers) ? row.layers.map(String) : [],
    options: row.options && typeof row.options === "object" ? row.options as Record<string, unknown> : {},
    configFingerprint: text(row.config_fingerprint),
    mapContext: row.map_context && typeof row.map_context === "object" ? row.map_context as Record<string, unknown> : {},
  }
}

function eventFromRow(row: Record<string, unknown>): EventRecord {
  return {
    id: String(row.id),
    visitorId: String(row.visitor_id),
    sessionId: text(row.session_id),
    analysisRunId: text(row.analysis_run_id),
    leadId: text(row.lead_id),
    eventName: String(row.event_name),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {},
    createdAt: String(row.created_at),
  }
}

function surveyFromRow(row: Record<string, unknown>): SurveyRecord {
  return {
    id: String(row.id),
    visitorId: String(row.visitor_id),
    sessionId: text(row.session_id),
    surveyVersion: Number(row.survey_version),
    status: row.status === "completed" ? "completed" : "draft",
    answers: (row.answers ?? {}) as StoredSurveyAnswers | SurveyAnswers,
    contextSnapshot: row.context_snapshot && typeof row.context_snapshot === "object" ? row.context_snapshot as Record<string, unknown> : {},
    startedAt: text(row.started_at),
    completedAt: text(row.completed_at),
    durationSeconds: numberOrNull(row.duration_seconds),
    abandonStep: numberOrNull(row.abandon_step),
    appVersion: text(row.app_version) ?? "",
    analysisEngineVersion: text(row.analysis_engine_version) ?? "",
  }
}

function leadFromRow(row: Record<string, unknown>): LeadRecord {
  return {
    id: String(row.id),
    visitorId: String(row.visitor_id),
    surveyResponseId: text(row.survey_response_id),
    businessInterest: row.business_interest === "info" ? "info" : "discuss",
    name: text(row.name),
    organisation: text(row.organisation),
    email: text(row.email),
    phone: text(row.phone),
    role: text(row.role),
    organisationWorkFrequency: text(row.organisation_work_frequency),
    usefulnessScore: numberOrNull(row.usefulness_score),
    intendedUseCases: Array.isArray(row.intended_use_cases) ? row.intended_use_cases.map(String) : [],
    requestedCapabilities: Array.isArray(row.requested_capabilities) ? row.requested_capabilities.map(String) : [],
    workflowStages: Array.isArray(row.workflow_stages) ? row.workflow_stages.map(String) : [],
    automationNeed: text(row.automation_need),
    whatTheyWantToDiscuss: text(row.what_they_want_to_discuss),
    acquisitionSource: text(row.acquisition_source),
    utmCampaign: text(row.utm_campaign),
    createdAt: String(row.created_at),
  }
}

function text(value: unknown) {
  return typeof value === "string" && value ? value : null
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isTrialLimit(error: DbError) {
  return `${error?.code ?? ""} ${error?.message ?? ""}`.includes("trial_limit")
}

function isUnique(error: DbError) {
  const textValue = `${error?.code ?? ""} ${error?.message ?? ""}`
  return error?.code === "23505" || textValue.includes("duplicate key")
}

function asStoreError(error: DbError) {
  if (isMissing(error)) return new TrialStoreUnavailableError()
  return new TrialStoreUnavailableError()
}

function isMissing(error: DbError) {
  const textValue = `${error?.code ?? ""} ${error?.message ?? ""}`
  return error?.code === "PGRST205" || error?.code === "42P01" || textValue.includes("sa_beta_")
}

export async function betaTablesAvailable() {
  try {
    const { error } = await client().from("sa_beta_settings").select("id").limit(1)
    return !error
  } catch {
    return false
  }
}
