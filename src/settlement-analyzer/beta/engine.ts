import { randomUUID } from "node:crypto"
import {
  ANALYSIS_ENGINE_VERSION,
  APP_VERSION,
  BETA_SETTINGS_DEFAULTS,
  RUN_RESERVATION_TTL_MS,
  SESSION_IDLE_MS,
  type BetaSettings,
} from "./config"
import {
  canonicalizeSurvey,
  claimStatus,
  configFingerprint,
  finishFlags,
  isTerminalSurvey,
  sofiaDate,
} from "./decisions"
import type {
  BetaPublicState,
  BusinessInterest,
  RunStatus,
  StoredSurveyAnswers,
  SurveyAnswers,
  SurveyStatus,
} from "./types"

export interface VisitorRecord {
  id: string
  authenticatedUserId: string | null
  contactId: string | null
  surveyStatus: SurveyStatus
  surveyVersion: number | null
  surveyFirstShownAt: string | null
  surveyStartedAt: string | null
  surveyCompletedAt: string | null
  surveyDurationSeconds: number | null
  surveyAbandonStep: number | null
  firstSeenAt: string
  lastSeenAt: string
  landingPage: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  locale: string | null
  language: string | null
  timezone: string | null
}

export interface SessionRecord {
  id: string
  visitorId: string
  startedAt: string
  lastSeenAt: string
  landingPage: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  locale: string | null
  language: string | null
  timezone: string | null
  deviceCategory: string | null
  browserFamily: string | null
  osFamily: string | null
  viewportWidth: number | null
  viewportHeight: number | null
  abuseSignal: string | null
  appVersion: string
  analysisEngineVersion: string
}

export interface RunRecord {
  id: string
  visitorId: string
  sessionId: string
  clientRunId: string
  status: RunStatus
  countsTowardTrial: boolean
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  errorCode: string | null
  errorCategory: string | null
  appVersion: string
  analysisEngineVersion: string
  settlementKey: string | null
  settlementName: string | null
  municipality: string | null
  region: string | null
  areaKm2: number | null
  analysisPackage: string | null
  layers: string[]
  options: Record<string, unknown>
  configFingerprint: string | null
  mapContext: Record<string, unknown>
}

export interface EventRecord {
  id: string
  visitorId: string
  sessionId: string | null
  analysisRunId: string | null
  leadId: string | null
  eventName: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface SurveyRecord {
  id: string
  visitorId: string
  sessionId: string | null
  surveyVersion: number
  status: "draft" | "completed"
  answers: StoredSurveyAnswers | SurveyAnswers
  contextSnapshot: Record<string, unknown>
  startedAt: string | null
  completedAt: string | null
  durationSeconds: number | null
  abandonStep: number | null
  appVersion: string
  analysisEngineVersion: string
}

export interface LeadRecord {
  id: string
  visitorId: string
  surveyResponseId: string | null
  businessInterest: "discuss" | "info"
  name: string | null
  organisation: string | null
  email: string | null
  phone: string | null
  role: string | null
  organisationWorkFrequency: string | null
  usefulnessScore: number | null
  intendedUseCases: string[]
  requestedCapabilities: string[]
  workflowStages: string[]
  automationNeed: string | null
  whatTheyWantToDiscuss: string | null
  acquisitionSource: string | null
  utmCampaign: string | null
  createdAt: string
}

export interface BetaMemory {
  settings: BetaSettings
  visitors: VisitorRecord[]
  sessions: SessionRecord[]
  runs: RunRecord[]
  events: EventRecord[]
  surveys: SurveyRecord[]
  leads: LeadRecord[]
}

export function emptyMemory(): BetaMemory {
  return {
    settings: { ...BETA_SETTINGS_DEFAULTS },
    visitors: [],
    sessions: [],
    runs: [],
    events: [],
    surveys: [],
    leads: [],
  }
}

export interface AttributionInput {
  landingPage: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  locale: string | null
  language: string | null
  timezone: string | null
  deviceCategory: string | null
  browserFamily: string | null
  osFamily: string | null
  viewportWidth: number | null
  viewportHeight: number | null
}

export interface TouchInput {
  now: string
  privileged: boolean
  visitorCookie: string | null
  visitorHeader: string | null
  sessionCookie: string | null
  contactId: string | null
  authenticatedUserId: string | null
  abuseSignal: string | null
  attribution: AttributionInput
  ids?: () => string
}

export interface BeginInput {
  now: string
  privileged: boolean
  visitorId: string
  sessionId: string
  clientRunId: string
  settlementKey: string
  settlementName: string
  municipality: string
  region: string
  lat: number
  lon: number
  mode: string
  layers: string[]
  dataSource: "pack" | "live"
  ids?: () => string
}

export interface FinishInput {
  now: string
  privileged: boolean
  visitorId: string
  clientRunId: string
  status: "success" | "failure" | "cancelled"
  errorCode?: string | null
  errorCategory?: string | null
  durationMs?: number | null
  summary?: {
    areaKm2?: number
    buildings?: number
    roadLengthKm?: number
    confidence?: string
    profile?: string
    boundaryReason?: string
    warnings?: string[]
    dataSource?: string
  }
}

export type SurveyAction =
  | { type: "impression" }
  | { type: "dismiss" }
  | { type: "start" }
  | { type: "draft"; answers: SurveyAnswers; step: number }
  | { type: "abandon"; step: number }
  | { type: "claim" }
  | { type: "complete"; answers: SurveyAnswers }

function idsOf(input?: () => string) {
  return input ?? randomUUID
}

function eventCount(memory: BetaMemory, visitorId: string, name: string) {
  return memory.events.filter((event) => event.visitorId === visitorId && event.eventName === name).length
}

function trialSuccesses(memory: BetaMemory, visitorId: string) {
  return memory.runs.filter((run) => run.visitorId === visitorId && run.status === "success" && run.countsTowardTrial)
}

function activeReservations(memory: BetaMemory, visitorId: string) {
  return memory.runs.filter((run) => run.visitorId === visitorId && run.status === "started" && run.countsTowardTrial)
}

function pushEvent(memory: BetaMemory, input: Omit<EventRecord, "id">, id: string) {
  if (input.eventName === "beta_page_view" && input.sessionId) {
    const exists = memory.events.some((event) => event.sessionId === input.sessionId && event.eventName === "beta_page_view")
    if (exists) return
  }
  memory.events.push({ ...input, id })
}

function touchActivity(memory: BetaMemory, visitorId: string, sessionId: string, now: string) {
  const visitor = memory.visitors.find((item) => item.id === visitorId)
  if (visitor) visitor.lastSeenAt = now
  const session = memory.sessions.find((item) => item.id === sessionId && item.visitorId === visitorId)
  if (session) session.lastSeenAt = now
}

function expireStale(memory: BetaMemory, visitorId: string, now: string) {
  const nowMs = Date.parse(now)
  for (const run of memory.runs) {
    if (run.visitorId !== visitorId || run.status !== "started" || !run.countsTowardTrial) continue
    if (nowMs - Date.parse(run.startedAt) <= RUN_RESERVATION_TTL_MS) continue
    run.status = "expired"
    run.completedAt = now
    run.errorCode = "expired"
    run.errorCategory = "expired"
  }
}

export function applyTouch(memory: BetaMemory, input: TouchInput) {
  const nextId = idsOf(input.ids)
  let visitor =
    (input.authenticatedUserId
      ? memory.visitors.find((item) => item.authenticatedUserId === input.authenticatedUserId)
      : undefined) ??
    (input.visitorCookie ? memory.visitors.find((item) => item.id === input.visitorCookie) : undefined) ??
    (input.visitorHeader ? memory.visitors.find((item) => item.id === input.visitorHeader) : undefined)

  if (!visitor) {
    visitor = {
      id: nextId(),
      authenticatedUserId: input.authenticatedUserId,
      contactId: input.contactId,
      surveyStatus: "never_seen",
      surveyVersion: null,
      surveyFirstShownAt: null,
      surveyStartedAt: null,
      surveyCompletedAt: null,
      surveyDurationSeconds: null,
      surveyAbandonStep: null,
      firstSeenAt: input.now,
      lastSeenAt: input.now,
      landingPage: input.attribution.landingPage,
      referrer: input.attribution.referrer,
      utmSource: input.attribution.utmSource,
      utmMedium: input.attribution.utmMedium,
      utmCampaign: input.attribution.utmCampaign,
      utmContent: input.attribution.utmContent,
      utmTerm: input.attribution.utmTerm,
      locale: input.attribution.locale,
      language: input.attribution.language,
      timezone: input.attribution.timezone,
    }
    memory.visitors.push(visitor)
  } else {
    visitor.lastSeenAt = input.now
    if (!visitor.authenticatedUserId && input.authenticatedUserId) {
      const taken = memory.visitors.some((item) => item.authenticatedUserId === input.authenticatedUserId && item.id !== visitor!.id)
      if (!taken) visitor.authenticatedUserId = input.authenticatedUserId
    }
    if (!visitor.contactId && input.contactId) visitor.contactId = input.contactId
    if (!visitor.utmSource && input.attribution.utmSource) {
      visitor.utmSource = input.attribution.utmSource
      visitor.utmMedium = input.attribution.utmMedium
      visitor.utmCampaign = input.attribution.utmCampaign
      visitor.utmContent = input.attribution.utmContent
      visitor.utmTerm = input.attribution.utmTerm
      visitor.referrer = visitor.referrer ?? input.attribution.referrer
      visitor.landingPage = visitor.landingPage ?? input.attribution.landingPage
    }
    visitor.locale = input.attribution.locale ?? visitor.locale
    visitor.language = input.attribution.language ?? visitor.language
    visitor.timezone = input.attribution.timezone ?? visitor.timezone
  }

  const currentSession = input.sessionCookie
    ? memory.sessions.find((session) => session.id === input.sessionCookie && session.visitorId === visitor!.id)
    : undefined
  const idle = currentSession ? Date.parse(input.now) - Date.parse(currentSession.lastSeenAt) > SESSION_IDLE_MS : true
  let session = currentSession && !idle ? currentSession : undefined
  if (session) {
    session.lastSeenAt = input.now
  } else {
    session = {
      id: nextId(),
      visitorId: visitor.id,
      startedAt: input.now,
      lastSeenAt: input.now,
      landingPage: input.attribution.landingPage,
      referrer: input.attribution.referrer,
      utmSource: input.attribution.utmSource,
      utmMedium: input.attribution.utmMedium,
      utmCampaign: input.attribution.utmCampaign,
      utmContent: input.attribution.utmContent,
      utmTerm: input.attribution.utmTerm,
      locale: input.attribution.locale,
      language: input.attribution.language,
      timezone: input.attribution.timezone,
      deviceCategory: input.attribution.deviceCategory,
      browserFamily: input.attribution.browserFamily,
      osFamily: input.attribution.osFamily,
      viewportWidth: input.attribution.viewportWidth,
      viewportHeight: input.attribution.viewportHeight,
      abuseSignal: input.abuseSignal,
      appVersion: APP_VERSION,
      analysisEngineVersion: ANALYSIS_ENGINE_VERSION,
    }
    memory.sessions.push(session)
  }

  pushEvent(memory, {
    visitorId: visitor.id,
    sessionId: session.id,
    analysisRunId: null,
    leadId: null,
    eventName: "beta_page_view",
    metadata: { landingPage: input.attribution.landingPage },
    createdAt: input.now,
  }, nextId())

  return { visitorId: visitor.id, sessionId: session.id }
}

export function applyBegin(memory: BetaMemory, input: BeginInput) {
  const nextId = idsOf(input.ids)
  touchActivity(memory, input.visitorId, input.sessionId, input.now)
  expireStale(memory, input.visitorId, input.now)
  const existing = memory.runs.find((run) => run.visitorId === input.visitorId && run.clientRunId === input.clientRunId)
  const successCount = trialSuccesses(memory, input.visitorId).length
  if (existing) {
    return {
      allowed: existing.status === "started",
      duplicate: true,
      reason: existing.status === "started" || existing.status === "success" ? undefined : "duplicate",
      analysisId: existing.id,
      clientRunId: existing.clientRunId,
      successCount,
      blocked: false,
    }
  }

  const active = activeReservations(memory, input.visitorId).length
  const trialLimit = memory.settings.trialLimit
  if (!input.privileged && (successCount >= trialLimit || successCount + active >= trialLimit)) {
    pushEvent(memory, {
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      analysisRunId: null,
      leadId: null,
      eventName: "trial_limit_reached",
      metadata: { successCount, active },
      createdAt: input.now,
    }, nextId())
    pushEvent(memory, {
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      analysisRunId: null,
      leadId: null,
      eventName: "trial_limit_blocked_analysis",
      metadata: { settlementKey: input.settlementKey, successCount },
      createdAt: input.now,
    }, nextId())
    return {
      allowed: false,
      duplicate: false,
      reason: "trial_limit" as const,
      analysisId: null,
      clientRunId: input.clientRunId,
      successCount,
      blocked: true,
    }
  }

  const fingerprint = configFingerprint({
    mode: input.mode,
    dataSource: input.dataSource,
    layers: input.layers,
  })
  const run: RunRecord = {
    id: nextId(),
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    clientRunId: input.clientRunId,
    status: "started",
    countsTowardTrial: !input.privileged,
    startedAt: input.now,
    completedAt: null,
    durationMs: null,
    errorCode: null,
    errorCategory: null,
    appVersion: APP_VERSION,
    analysisEngineVersion: ANALYSIS_ENGINE_VERSION,
    settlementKey: input.settlementKey,
    settlementName: input.settlementName,
    municipality: input.municipality,
    region: input.region,
    areaKm2: null,
    analysisPackage: `${input.dataSource}:${input.mode}`,
    layers: input.layers,
    options: { mode: input.mode, dataSource: input.dataSource },
    configFingerprint: fingerprint,
    mapContext: { lat: input.lat, lon: input.lon },
  }
  memory.runs.push(run)
  pushEvent(memory, {
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    analysisRunId: run.id,
    leadId: null,
    eventName: "analysis_started",
    metadata: {
      settlementKey: input.settlementKey,
      settlementName: input.settlementName,
      analysisPackage: run.analysisPackage,
      configFingerprint: fingerprint,
    },
    createdAt: input.now,
  }, nextId())
  return {
    allowed: true,
    duplicate: false,
    analysisId: run.id,
    clientRunId: input.clientRunId,
    successCount,
    blocked: false,
  }
}

export function applyFinish(memory: BetaMemory, input: FinishInput) {
  const nextId = idsOf()
  const run = memory.runs.find((item) => item.visitorId === input.visitorId && item.clientRunId === input.clientRunId)
  if (run) touchActivity(memory, input.visitorId, run.sessionId, input.now)
  if (!run) return { recorded: false, duplicate: false, promptFeedback: false, trialComplete: false, limitReached: false }
  if (run.status !== "started") {
    const successCount = trialSuccesses(memory, input.visitorId).length
    return {
      recorded: true,
      duplicate: true,
      promptFeedback: false,
      trialComplete: false,
      limitReached: !input.privileged && successCount >= memory.settings.trialLimit,
    }
  }

  run.status = input.status
  run.completedAt = input.now
  run.durationMs = input.durationMs ?? Math.max(0, Date.parse(input.now) - Date.parse(run.startedAt))
  run.errorCode = input.errorCode ?? null
  run.errorCategory = input.errorCategory ?? null
  if (input.summary) {
    if (typeof input.summary.areaKm2 === "number") run.areaKm2 = input.summary.areaKm2
    run.options = {
      ...run.options,
      profile: input.summary.profile ?? null,
      confidence: input.summary.confidence ?? null,
      boundaryReason: input.summary.boundaryReason ?? null,
      warnings: input.summary.warnings ?? [],
      buildings: input.summary.buildings ?? null,
      roadLengthKm: input.summary.roadLengthKm ?? null,
    }
    run.configFingerprint = configFingerprint({
      mode: String(run.options.mode ?? ""),
      dataSource: String(input.summary.dataSource ?? run.options.dataSource ?? ""),
      layers: run.layers,
      boundaryReason: input.summary.boundaryReason ?? null,
    })
    run.mapContext = { ...run.mapContext, areaKm2: run.areaKm2 }
  }

  const eventName = input.status === "success" ? "analysis_succeeded" : input.status === "failure" ? "analysis_failed" : null
  if (eventName) {
    pushEvent(memory, {
      visitorId: input.visitorId,
      sessionId: run.sessionId,
      analysisRunId: run.id,
      leadId: null,
      eventName,
      metadata: {
        settlementKey: run.settlementKey,
        analysisPackage: run.analysisPackage,
        configFingerprint: run.configFingerprint,
        errorCode: run.errorCode,
        errorCategory: run.errorCategory,
        countsTowardTrial: run.countsTowardTrial,
      },
      createdAt: input.now,
    }, nextId())
  }

  const visitor = memory.visitors.find((item) => item.id === input.visitorId)
  const successCount = trialSuccesses(memory, input.visitorId).length
  const flags = finishFlags({
    justSucceeded: input.status === "success",
    countsTowardTrial: run.countsTowardTrial,
    trialSuccessCount: successCount,
    surveyStatus: visitor?.surveyStatus ?? "never_seen",
    privileged: input.privileged,
    feedbackTriggerCount: memory.settings.feedbackTriggerCount,
    trialLimit: memory.settings.trialLimit,
  })
  return { recorded: true, duplicate: false, ...flags }
}

export function applySurvey(
  memory: BetaMemory,
  input: { now: string; visitorId: string; sessionId: string; action: SurveyAction; ids?: () => string },
) {
  const nextId = idsOf(input.ids)
  const surveyVersion = memory.settings.surveyVersion
  const visitor = memory.visitors.find((item) => item.id === input.visitorId)
  if (!visitor) return { ok: false as const }
  const completed = memory.surveys.find((item) => item.visitorId === visitor.id && item.status === "completed")

  if (input.action.type === "impression") {
    if (!isTerminalSurvey(visitor.surveyStatus)) {
      if (visitor.surveyStatus === "never_seen") visitor.surveyStatus = "shown"
      if (!visitor.surveyFirstShownAt) visitor.surveyFirstShownAt = input.now
      visitor.surveyVersion = surveyVersion
      pushEvent(memory, {
        visitorId: visitor.id,
        sessionId: input.sessionId,
        analysisRunId: null,
        leadId: null,
        eventName: "beta_feedback_prompt_shown",
        metadata: { surveyVersion: surveyVersion },
        createdAt: input.now,
      }, nextId())
    }
  }

  if (input.action.type === "dismiss") {
    if (!isTerminalSurvey(visitor.surveyStatus)) {
      visitor.surveyStatus = "dismissed_continue"
      pushEvent(memory, {
        visitorId: visitor.id,
        sessionId: input.sessionId,
        analysisRunId: null,
        leadId: null,
        eventName: "beta_feedback_dismissed_continue",
        metadata: {},
        createdAt: input.now,
      }, nextId())
    }
  }

  if (input.action.type === "start") {
    if (visitor.surveyStatus !== "completed_verified") {
      const reopened = eventCount(memory, visitor.id, "beta_feedback_started") > 0
      if (visitor.surveyStatus !== "already_completed_claimed") visitor.surveyStatus = "started"
      if (!visitor.surveyStartedAt) visitor.surveyStartedAt = input.now
      visitor.surveyVersion = surveyVersion
      pushEvent(memory, {
        visitorId: visitor.id,
        sessionId: input.sessionId,
        analysisRunId: null,
        leadId: null,
        eventName: "beta_feedback_started",
        metadata: { surveyVersion: surveyVersion, reopened },
        createdAt: input.now,
      }, nextId())
      if (reopened) {
        pushEvent(memory, {
          visitorId: visitor.id,
          sessionId: input.sessionId,
          analysisRunId: null,
          leadId: null,
          eventName: "feedback_reopened",
          metadata: { surveyVersion: surveyVersion },
          createdAt: input.now,
        }, nextId())
      }
    }
  }

  if (input.action.type === "draft" || input.action.type === "abandon") {
    if (!completed) {
      const existing = memory.surveys.find((item) => item.visitorId === visitor.id && item.surveyVersion === surveyVersion)
      const answers = input.action.type === "draft" ? input.action.answers : existing?.answers ?? {}
      if (!existing) {
        memory.surveys.push({
          id: nextId(),
          visitorId: visitor.id,
          sessionId: input.sessionId,
          surveyVersion: surveyVersion,
          status: "draft",
          answers: answers as SurveyAnswers,
          contextSnapshot: {},
          startedAt: visitor.surveyStartedAt,
          completedAt: null,
          durationSeconds: null,
          abandonStep: input.action.type === "abandon" ? input.action.step : input.action.step,
          appVersion: APP_VERSION,
          analysisEngineVersion: ANALYSIS_ENGINE_VERSION,
        })
      } else if (existing.status !== "completed") {
        if (input.action.type === "draft") existing.answers = input.action.answers
        existing.abandonStep = input.action.step
        existing.sessionId = input.sessionId
      }
      visitor.surveyAbandonStep = input.action.step
      if (input.action.type === "abandon") {
        pushEvent(memory, {
          visitorId: visitor.id,
          sessionId: input.sessionId,
          analysisRunId: null,
          leadId: null,
          eventName: "survey_abandoned",
          metadata: { step: input.action.step },
          createdAt: input.now,
        }, nextId())
      }
    }
  }

  if (input.action.type === "claim") {
    pushEvent(memory, {
      visitorId: visitor.id,
      sessionId: input.sessionId,
      analysisRunId: null,
      leadId: null,
      eventName: "survey_already_completed_clicked",
      metadata: { hadCompletedResponse: Boolean(completed) },
      createdAt: input.now,
    }, nextId())
    visitor.surveyStatus = claimStatus(Boolean(completed), visitor.surveyStatus)
    if (completed && !visitor.surveyCompletedAt) visitor.surveyCompletedAt = completed.completedAt
  }

  if (input.action.type === "complete") {
    if (completed) {
      visitor.surveyStatus = "completed_verified"
      return { ok: true as const, overwritten: false }
    }
    const canonical = canonicalizeSurvey(input.action.answers)
    if (!canonical.ok) return { ok: false as const, issues: canonical.issues }
    const snapshot = contextSnapshot(memory, visitor.id)
    const startedAt = visitor.surveyStartedAt ?? input.now
    const durationSeconds = Math.max(0, Math.round((Date.parse(input.now) - Date.parse(startedAt)) / 1000))
    let row = memory.surveys.find((item) => item.visitorId === visitor.id && item.surveyVersion === surveyVersion)
    if (!row) {
      row = {
        id: nextId(),
        visitorId: visitor.id,
        sessionId: input.sessionId,
        surveyVersion: surveyVersion,
        status: "completed",
        answers: canonical.stored,
        contextSnapshot: snapshot,
        startedAt,
        completedAt: input.now,
        durationSeconds,
        abandonStep: null,
        appVersion: APP_VERSION,
        analysisEngineVersion: ANALYSIS_ENGINE_VERSION,
      }
      memory.surveys.push(row)
    } else {
      row.status = "completed"
      row.answers = canonical.stored
      row.contextSnapshot = snapshot
      row.startedAt = startedAt
      row.completedAt = input.now
      row.durationSeconds = durationSeconds
      row.abandonStep = null
      row.sessionId = input.sessionId
    }
    visitor.surveyStatus = "completed_verified"
    visitor.surveyVersion = surveyVersion
    visitor.surveyStartedAt = startedAt
    visitor.surveyCompletedAt = input.now
    visitor.surveyDurationSeconds = durationSeconds
    visitor.surveyAbandonStep = null
    pushEvent(memory, {
      visitorId: visitor.id,
      sessionId: input.sessionId,
      analysisRunId: null,
      leadId: null,
      eventName: "survey_completed",
      metadata: { surveyVersion: surveyVersion, businessInterest: canonical.stored.business_interest },
      createdAt: input.now,
    }, nextId())
    const interest = canonical.stored.business_interest
    const interestEvent = interest === "discuss" ? "lead_interest_yes" : interest === "info" ? "lead_interest_maybe" : "lead_interest_no"
    pushEvent(memory, {
      visitorId: visitor.id,
      sessionId: input.sessionId,
      analysisRunId: null,
      leadId: null,
      eventName: interestEvent,
      metadata: {},
      createdAt: input.now,
    }, nextId())
    if (interest === "discuss" || interest === "info") {
      const contact = canonical.stored.contact
      const lead: LeadRecord = {
        id: nextId(),
        visitorId: visitor.id,
        surveyResponseId: row.id,
        businessInterest: interest,
        name: contact?.name ?? null,
        organisation: contact?.organisation ?? null,
        email: contact?.email ?? null,
        phone: contact?.phone ?? null,
        role: canonical.stored.role,
        organisationWorkFrequency: canonical.stored.organisation_work_frequency,
        usefulnessScore: canonical.stored.usefulness_score,
        intendedUseCases: canonical.stored.intended_use_cases,
        requestedCapabilities: canonical.stored.requested_capabilities,
        workflowStages: canonical.stored.workflow_stages,
        automationNeed: canonical.stored.automation_need,
        whatTheyWantToDiscuss: contact?.topic ?? null,
        acquisitionSource: visitor.utmSource || "direct",
        utmCampaign: visitor.utmCampaign,
        createdAt: input.now,
      }
      const existingLead = memory.leads.find((item) => item.visitorId === visitor.id)
      if (!existingLead) memory.leads.push(lead)
      if (contact?.email) {
        pushEvent(memory, {
          visitorId: visitor.id,
          sessionId: input.sessionId,
          analysisRunId: null,
          leadId: (existingLead ?? lead).id,
          eventName: "lead_submitted",
          metadata: { businessInterest: interest },
          createdAt: input.now,
        }, nextId())
      }
    }
  }

  return { ok: true as const }
}

export function applyClientEvent(
  memory: BetaMemory,
  input: { now: string; visitorId: string; sessionId: string; eventName: "trial_limit_modal_shown" | "survey_step_viewed"; metadata?: Record<string, unknown>; ids?: () => string },
) {
  pushEvent(memory, {
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    analysisRunId: null,
    leadId: null,
    eventName: input.eventName,
    metadata: input.metadata ?? {},
    createdAt: input.now,
  }, idsOf(input.ids)())
}

export function contextSnapshot(memory: BetaMemory, visitorId: string) {
  const visitor = memory.visitors.find((item) => item.id === visitorId)
  const runs = memory.runs.filter((run) => run.visitorId === visitorId)
  const successes = runs.filter((run) => run.status === "success")
  const packages = [...new Set(successes.map((run) => run.analysisPackage).filter(Boolean))]
  const layers = [...new Set(successes.flatMap((run) => run.layers))]
  const firstAnalysis = successes.map((run) => run.completedAt).filter((value): value is string => Boolean(value)).sort()[0] ?? null
  const lastAnalysis = successes.map((run) => run.completedAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null
  return {
    successful_analysis_count: successes.length,
    failed_analysis_count: runs.filter((run) => run.status === "failure").length,
    session_count: memory.sessions.filter((session) => session.visitorId === visitorId).length,
    distinct_active_days: distinctActiveDays(memory, visitorId),
    distinct_settlement_count: new Set(successes.map((run) => run.settlementKey).filter(Boolean)).size,
    analysis_packages: packages,
    layers,
    options: successes.map((run) => run.options),
    first_seen_at: visitor?.firstSeenAt ?? null,
    last_seen_at: visitor?.lastSeenAt ?? null,
    first_analysis_at: firstAnalysis,
    last_analysis_at: lastAnalysis,
    acquisition_source: visitor?.utmSource || "direct",
    utm_source: visitor?.utmSource ?? null,
    utm_medium: visitor?.utmMedium ?? null,
    utm_campaign: visitor?.utmCampaign ?? null,
    utm_content: visitor?.utmContent ?? null,
    utm_term: visitor?.utmTerm ?? null,
    referrer: visitor?.referrer ?? null,
    survey_version: memory.settings.surveyVersion,
    app_version: APP_VERSION,
    analysis_engine_version: ANALYSIS_ENGINE_VERSION,
  }
}

export function distinctActiveDays(memory: BetaMemory, visitorId: string) {
  const days = new Set<string>()
  for (const session of memory.sessions) {
    if (session.visitorId === visitorId) days.add(sofiaDate(session.startedAt))
  }
  for (const run of memory.runs) {
    if (run.visitorId === visitorId && run.status === "success" && run.completedAt) days.add(sofiaDate(run.completedAt))
  }
  return days.size
}

export function repeatSameSettlementCount(memory: BetaMemory, visitorId: string) {
  const counts = new Map<string, number>()
  for (const run of memory.runs) {
    if (run.visitorId !== visitorId || run.status !== "success" || !run.settlementKey) continue
    counts.set(run.settlementKey, (counts.get(run.settlementKey) ?? 0) + 1)
  }
  let extra = 0
  for (const count of counts.values()) if (count > 1) extra += count - 1
  return extra
}

export function projectVisitor(memory: BetaMemory, visitorId: string, privileged: boolean): BetaPublicState {
  const visitor = memory.visitors.find((item) => item.id === visitorId)
  const session = [...memory.sessions].reverse().find((item) => item.visitorId === visitorId)
  const runs = memory.runs.filter((run) => run.visitorId === visitorId)
  const successes = runs.filter((run) => run.status === "success")
  const trialSuccessCount = successes.filter((run) => run.countsTowardTrial).length
  const completed = memory.surveys.find((item) => item.visitorId === visitorId && item.status === "completed")
  const draft = memory.surveys.find((item) => item.visitorId === visitorId && item.surveyVersion === memory.settings.surveyVersion && item.status === "draft")
  const lead = memory.leads.find((item) => item.visitorId === visitorId)
  const storedInterest = completed && isStored(completed.answers) ? completed.answers.business_interest : null
  const surveyStatus: SurveyStatus = completed ? "completed_verified" : visitor?.surveyStatus ?? "never_seen"
  const fingerprints = new Set(successes.map((run) => run.configFingerprint).filter(Boolean))
  return {
    privileged,
    visitorId,
    sessionId: session?.id ?? "",
    successCount: successes.length,
    trialSuccessCount,
    failureCount: runs.filter((run) => run.status === "failure").length,
    attemptCount: runs.length,
    sessionCount: memory.sessions.filter((item) => item.visitorId === visitorId).length,
    distinctActiveDays: distinctActiveDays(memory, visitorId),
    distinctSettlementCount: new Set(successes.map((run) => run.settlementKey).filter(Boolean)).size,
    repeatSameSettlementCount: repeatSameSettlementCount(memory, visitorId),
    configurationVariation: fingerprints.size,
    surveyStatus,
    surveyImpressionCount: eventCount(memory, visitorId, "beta_feedback_prompt_shown"),
    surveyStartCount: eventCount(memory, visitorId, "beta_feedback_started"),
    surveyCompletionCount: eventCount(memory, visitorId, "survey_completed"),
    alreadyCompletedClaimCount: eventCount(memory, visitorId, "survey_already_completed_clicked"),
    businessInterest: (lead?.businessInterest ?? storedInterest ?? null) as BusinessInterest | null,
    feedbackEntry: surveyStatus !== "never_seen",
    limitReached: !privileged && trialSuccessCount >= memory.settings.trialLimit,
    trialLimit: memory.settings.trialLimit,
    feedbackTriggerCount: memory.settings.feedbackTriggerCount,
    surveyVersion: memory.settings.surveyVersion,
    draft: draft && isClientDraft(draft.answers) ? draft.answers : null,
  }
}

function isStored(value: StoredSurveyAnswers | SurveyAnswers): value is StoredSurveyAnswers {
  return "usefulness_score" in value || "intended_use_cases" in value
}

function isClientDraft(value: StoredSurveyAnswers | SurveyAnswers): value is SurveyAnswers {
  return "usefulnessScore" in value
}
