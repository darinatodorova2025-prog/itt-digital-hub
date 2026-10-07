import { describe, expect, it } from "vitest"
import { RUN_RESERVATION_TTL_MS, SESSION_IDLE_MS } from "./config"
import { funnelRow } from "./decisions"
import {
  applyBegin,
  applyFinish,
  applySurvey,
  applyTouch,
  emptyMemory,
  projectVisitor,
  type AttributionInput,
  type BetaMemory,
} from "./engine"
import { emptySurveyAnswers } from "./decisions"
import type { SurveyAnswers } from "./types"

const attribution: AttributionInput = {
  landingPage: "/bg/settlement-analyzer?utm_source=vik_conference&utm_campaign=summit_2026",
  referrer: "https://conference.example",
  utmSource: "vik_conference",
  utmMedium: "qr",
  utmCampaign: "summit_2026",
  utmContent: "booth",
  utmTerm: null,
  locale: "bg",
  language: "bg-BG",
  timezone: "Europe/Sofia",
  deviceCategory: "desktop",
  browserFamily: "Chrome",
  osFamily: "macOS",
  viewportWidth: 1440,
  viewportHeight: 900,
}

function ids(prefix: string) {
  let n = 0
  return () => `${prefix}-${++n}`
}

function open(memory: BetaMemory, now: string, extra: Partial<Parameters<typeof applyTouch>[1]> = {}) {
  return applyTouch(memory, {
    now,
    privileged: false,
    visitorCookie: null,
    visitorHeader: null,
    sessionCookie: null,
    contactId: null,
    authenticatedUserId: null,
    abuseSignal: null,
    attribution,
    ids: ids("id"),
    ...extra,
  })
}

function succeed(
  memory: BetaMemory,
  visitorId: string,
  sessionId: string,
  now: string,
  settlementKey: string,
  options?: { mode?: string; layers?: string[]; privileged?: boolean },
) {
  const clientRunId = `run-${settlementKey}-${now}`
  const begun = applyBegin(memory, {
    now,
    privileged: options?.privileged ?? false,
    visitorId,
    sessionId,
    clientRunId,
    settlementKey,
    settlementName: settlementKey,
    municipality: "Община",
    region: "Област",
    lat: 42.1,
    lon: 25.2,
    mode: options?.mode ?? "supply",
    layers: options?.layers ?? ["boundary", "roads"],
    dataSource: "pack",
  })
  const finished = applyFinish(memory, {
    now,
    privileged: options?.privileged ?? false,
    visitorId,
    clientRunId,
    status: "success",
    durationMs: 1200,
    summary: { areaKm2: 1.2, buildings: 10, boundaryReason: "openGeometry", dataSource: "pack", profile: "lowBuiltUp" },
  })
  return { begun, finished, clientRunId }
}

function answers(interest: SurveyAnswers["businessInterest"], email = ""): SurveyAnswers {
  return {
    ...emptySurveyAnswers(),
    usefulnessScore: 4,
    intendedUseCases: ["preliminary_settlement"],
    requestedCapabilities: ["existing_network"],
    timeSink: "site_check",
    role: "water_designer",
    workFrequency: "monthly",
    workflowStages: ["pre_design"],
    automationNeed: "Автоматично оразмеряване на клонове",
    businessInterest: interest,
    contactName: "Иван Петров",
    contactOrganisation: "Пример ООД",
    contactEmail: email,
    contactPhone: "",
    contactTopic: "Пилотен проект",
  }
}

describe("beta trial lifecycle", () => {
  it("scenario A: feedback after 3, continue, complete at 5, block 6", () => {
    const memory = emptyMemory()
    const { visitorId, sessionId } = open(memory, "2026-10-07T09:00:00.000Z")
    const first = succeed(memory, visitorId, sessionId, "2026-10-07T09:01:00.000Z", "04964")
    expect(first.finished.promptFeedback).toBe(false)
    succeed(memory, visitorId, sessionId, "2026-10-07T09:02:00.000Z", "35167")
    const third = succeed(memory, visitorId, sessionId, "2026-10-07T09:03:00.000Z", "49014")
    expect(third.finished.promptFeedback).toBe(true)
    expect(third.finished.trialComplete).toBe(false)
    applySurvey(memory, { now: "2026-10-07T09:04:00.000Z", visitorId, sessionId, action: { type: "impression" } })
    applySurvey(memory, { now: "2026-10-07T09:05:00.000Z", visitorId, sessionId, action: { type: "dismiss" } })
    succeed(memory, visitorId, sessionId, "2026-10-07T09:06:00.000Z", "56784")
    const fifth = succeed(memory, visitorId, sessionId, "2026-10-07T09:07:00.000Z", "65927")
    expect(fifth.finished.trialComplete).toBe(true)
    expect(fifth.finished.promptFeedback).toBe(false)
    const blocked = applyBegin(memory, {
      now: "2026-10-07T09:08:00.000Z",
      privileged: false,
      visitorId,
      sessionId,
      clientRunId: "sixth",
      settlementKey: "68850",
      settlementName: "Стара Загора",
      municipality: "Стара Загора",
      region: "Стара Загора",
      lat: 42.4,
      lon: 25.6,
      mode: "supply",
      layers: ["roads"],
      dataSource: "pack",
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.reason).toBe("trial_limit")
    expect(projectVisitor(memory, visitorId, false).trialSuccessCount).toBe(memory.settings.trialLimit)
    expect(memory.runs.filter((run) => run.status === "success")).toHaveLength(5)
  })

  it("scenario B: verified survey is acknowledged and not counted as a claim", () => {
    const memory = emptyMemory()
    const { visitorId, sessionId } = open(memory, "2026-10-07T09:00:00.000Z")
    for (let index = 1; index <= 3; index += 1) {
      succeed(memory, visitorId, sessionId, `2026-10-07T09:0${index}:00.000Z`, `place-${index}`)
    }
    applySurvey(memory, { now: "2026-10-07T09:04:00.000Z", visitorId, sessionId, action: { type: "start" } })
    applySurvey(memory, { now: "2026-10-07T09:05:00.000Z", visitorId, sessionId, action: { type: "complete", answers: answers("discuss", "ivan@example.com") } })
    const state = projectVisitor(memory, visitorId, false)
    expect(state.surveyStatus).toBe("completed_verified")
    expect(state.surveyCompletionCount).toBe(1)
    expect(state.businessInterest).toBe("discuss")
    succeed(memory, visitorId, sessionId, "2026-10-07T09:06:00.000Z", "place-4")
    const fifth = succeed(memory, visitorId, sessionId, "2026-10-07T09:07:00.000Z", "place-5")
    expect(fifth.finished.trialComplete).toBe(true)
    expect(fifth.finished.promptFeedback).toBe(false)
    const blocked = applyBegin(memory, {
      now: "2026-10-07T09:08:00.000Z", privileged: false, visitorId, sessionId, clientRunId: "sixth",
      settlementKey: "x", settlementName: "x", municipality: "x", region: "x", lat: 1, lon: 1, mode: "supply", layers: [], dataSource: "live",
    })
    expect(blocked.allowed).toBe(false)
  })

  it("scenario C and D: claimed completion is distinct from a verified response", () => {
    const memory = emptyMemory()
    const { visitorId, sessionId } = open(memory, "2026-10-07T09:00:00.000Z")
    applySurvey(memory, { now: "2026-10-07T09:01:00.000Z", visitorId, sessionId, action: { type: "claim" } })
    applySurvey(memory, { now: "2026-10-07T09:02:00.000Z", visitorId, sessionId, action: { type: "claim" } })
    let state = projectVisitor(memory, visitorId, false)
    expect(state.surveyStatus).toBe("already_completed_claimed")
    expect(state.surveyCompletionCount).toBe(0)
    expect(state.alreadyCompletedClaimCount).toBe(2)
    const row = funnelRow({
      trialSuccessCount: 0,
      impressionCount: 0,
      startCount: 0,
      surveyStatus: state.surveyStatus,
      hasCompletedResponse: false,
      claimCount: state.alreadyCompletedClaimCount,
      businessInterest: null,
      leadEmail: null,
      feedbackTriggerCount: memory.settings.feedbackTriggerCount,
      trialLimit: memory.settings.trialLimit,
    })
    expect(row.surveyCompleted).toBe(false)
    expect(row.alreadyCompletedClaimed).toBe(true)

    applySurvey(memory, { now: "2026-10-07T09:03:00.000Z", visitorId, sessionId, action: { type: "complete", answers: answers("not_now") } })
    state = projectVisitor(memory, visitorId, false)
    expect(state.surveyStatus).toBe("completed_verified")
    expect(state.surveyCompletionCount).toBe(1)
    expect(state.alreadyCompletedClaimCount).toBe(2)
    expect(memory.leads).toHaveLength(0)

    const before = JSON.stringify(memory.surveys[0].answers)
    applySurvey(memory, { now: "2026-10-07T09:04:00.000Z", visitorId, sessionId, action: { type: "claim" } })
    expect(JSON.stringify(memory.surveys[0].answers)).toBe(before)
    expect(projectVisitor(memory, visitorId, false).surveyStatus).toBe("completed_verified")
    expect(projectVisitor(memory, visitorId, false).alreadyCompletedClaimCount).toBe(3)
  })

  it("scenario E and F: refresh keeps the count and a later day is a new active day", () => {
    const memory = emptyMemory()
    const first = open(memory, "2026-10-07T09:00:00.000Z")
    succeed(memory, first.visitorId, first.sessionId, "2026-10-07T09:10:00.000Z", "04964")
    succeed(memory, first.visitorId, first.sessionId, "2026-10-07T09:20:00.000Z", "04964")
    succeed(memory, first.visitorId, first.sessionId, "2026-10-07T09:30:00.000Z", "35167")
    const refreshed = open(memory, "2026-10-07T09:40:00.000Z", {
      visitorCookie: first.visitorId,
      sessionCookie: first.sessionId,
    })
    expect(refreshed.visitorId).toBe(first.visitorId)
    expect(projectVisitor(memory, first.visitorId, false).trialSuccessCount).toBe(3)
    const nextDay = open(memory, "2026-10-08T09:00:00.000Z", { visitorCookie: first.visitorId, sessionCookie: first.sessionId })
    expect(nextDay.sessionId).not.toBe(first.sessionId)
    const state = projectVisitor(memory, first.visitorId, false)
    expect(state.sessionCount).toBe(2)
    expect(state.distinctActiveDays).toBe(2)
    expect(state.distinctSettlementCount).toBe(2)
    expect(state.repeatSameSettlementCount).toBe(1)
  })

  it("scenario G and H: failures and duplicate finishes do not add a success", () => {
    const memory = emptyMemory()
    const { visitorId, sessionId } = open(memory, "2026-10-07T09:00:00.000Z")
    const clientRunId = "same-run"
    applyBegin(memory, {
      now: "2026-10-07T09:01:00.000Z", privileged: false, visitorId, sessionId, clientRunId,
      settlementKey: "04964", settlementName: "Боженците", municipality: "Габрово", region: "Габрово",
      lat: 42.8, lon: 25.4, mode: "supply", layers: ["roads"], dataSource: "pack",
    })
    const again = applyBegin(memory, {
      now: "2026-10-07T09:01:01.000Z", privileged: false, visitorId, sessionId, clientRunId,
      settlementKey: "04964", settlementName: "Боженците", municipality: "Габрово", region: "Габрово",
      lat: 42.8, lon: 25.4, mode: "supply", layers: ["roads"], dataSource: "pack",
    })
    expect(again.duplicate).toBe(true)
    expect(memory.runs).toHaveLength(1)
    const failed = applyFinish(memory, { now: "2026-10-07T09:02:00.000Z", privileged: false, visitorId, clientRunId, status: "failure", errorCode: "unavailable", errorCategory: "upstream" })
    expect(failed.promptFeedback).toBe(false)
    expect(projectVisitor(memory, visitorId, false).trialSuccessCount).toBe(0)
    expect(projectVisitor(memory, visitorId, false).failureCount).toBe(1)
    const duplicateFinish = applyFinish(memory, { now: "2026-10-07T09:03:00.000Z", privileged: false, visitorId, clientRunId, status: "success" })
    expect(duplicateFinish.duplicate).toBe(true)
    expect(projectVisitor(memory, visitorId, false).trialSuccessCount).toBe(0)

    const ok = succeed(memory, visitorId, sessionId, "2026-10-07T09:04:00.000Z", "04964")
    applyFinish(memory, { now: "2026-10-07T09:05:00.000Z", privileged: false, visitorId, clientRunId: ok.clientRunId, status: "success" })
    expect(projectVisitor(memory, visitorId, false).trialSuccessCount).toBe(1)
  })

  it("scenario I: privileged runs do not consume the trial", () => {
    const memory = emptyMemory()
    const { visitorId, sessionId } = open(memory, "2026-10-07T09:00:00.000Z")
    for (let index = 0; index < 8; index += 1) {
      const result = succeed(memory, visitorId, sessionId, `2026-10-07T09:${String(index).padStart(2, "0")}:00.000Z`, `p-${index}`, { privileged: true })
      expect(result.begun.allowed).toBe(true)
      expect(result.finished.trialComplete).toBe(false)
    }
    expect(projectVisitor(memory, visitorId, true).limitReached).toBe(false)
    expect(projectVisitor(memory, visitorId, true).trialSuccessCount).toBe(0)
    expect(projectVisitor(memory, visitorId, true).successCount).toBe(8)
  })

  it("scenarios J K L: interest controls the contact lead", () => {
    const notNow = emptyMemory()
    const a = open(notNow, "2026-10-07T09:00:00.000Z")
    applySurvey(notNow, { now: "2026-10-07T09:01:00.000Z", visitorId: a.visitorId, sessionId: a.sessionId, action: { type: "complete", answers: answers("not_now", "hidden@example.com") } })
    expect(notNow.leads).toHaveLength(0)
    expect(notNow.surveys[0].answers).toMatchObject({ contact: null, business_interest: "not_now" })

    const discuss = emptyMemory()
    const b = open(discuss, "2026-10-07T09:00:00.000Z")
    applySurvey(discuss, { now: "2026-10-07T09:01:00.000Z", visitorId: b.visitorId, sessionId: b.sessionId, action: { type: "complete", answers: answers("discuss", "lead@example.com") } })
    expect(discuss.leads[0]).toMatchObject({ businessInterest: "discuss", email: "lead@example.com", organisation: "Пример ООД" })
    expect(discuss.events.some((event) => event.eventName === "lead_submitted")).toBe(true)

    const maybe = emptyMemory()
    const c = open(maybe, "2026-10-07T09:00:00.000Z")
    applySurvey(maybe, { now: "2026-10-07T09:01:00.000Z", visitorId: c.visitorId, sessionId: c.sessionId, action: { type: "complete", answers: answers("info", "info@example.com") } })
    expect(maybe.leads[0].businessInterest).toBe("info")
    expect(maybe.events.some((event) => event.eventName === "lead_interest_maybe")).toBe(true)
  })

  it("scenario M: same settlement with different configuration stays distinguishable", () => {
    const memory = emptyMemory()
    const { visitorId, sessionId } = open(memory, "2026-10-07T09:00:00.000Z")
    succeed(memory, visitorId, sessionId, "2026-10-07T09:01:00.000Z", "04964", { mode: "supply", layers: ["roads"] })
    succeed(memory, visitorId, sessionId, "2026-10-07T09:02:00.000Z", "04964", { mode: "stormwater", layers: ["roads", "water"] })
    const state = projectVisitor(memory, visitorId, false)
    expect(state.distinctSettlementCount).toBe(1)
    expect(state.repeatSameSettlementCount).toBe(1)
    expect(state.configurationVariation).toBe(2)
    expect(new Set(memory.runs.map((run) => run.configFingerprint)).size).toBe(2)
  })

  it("keeps UTM from the first visit and releases a stale reservation", () => {
    const memory = emptyMemory()
    const first = open(memory, "2026-10-07T09:00:00.000Z")
    open(memory, "2026-10-07T12:00:00.000Z", {
      visitorCookie: first.visitorId,
      sessionCookie: first.sessionId,
      attribution: { ...attribution, utmSource: "other", utmCampaign: "other" },
    })
    expect(memory.visitors[0].utmSource).toBe("vik_conference")
    expect(memory.visitors[0].utmCampaign).toBe("summit_2026")

    applyBegin(memory, {
      now: "2026-10-07T10:00:00.000Z", privileged: false, visitorId: first.visitorId, sessionId: first.sessionId, clientRunId: "stale",
      settlementKey: "04964", settlementName: "Боженците", municipality: "Габрово", region: "Габрово",
      lat: 1, lon: 1, mode: "supply", layers: ["roads"], dataSource: "live",
    })
    for (let index = 0; index < memory.settings.trialLimit - 1; index += 1) {
      succeed(memory, first.visitorId, first.sessionId, `2026-10-07T10:1${index}:00.000Z`, `s-${index}`)
    }
    const later = new Date(Date.parse("2026-10-07T10:00:00.000Z") + RUN_RESERVATION_TTL_MS + 1000).toISOString()
    const next = applyBegin(memory, {
      now: later, privileged: false, visitorId: first.visitorId, sessionId: first.sessionId, clientRunId: "after-expiry",
      settlementKey: "04964", settlementName: "Боженците", municipality: "Габрово", region: "Габрово",
      lat: 1, lon: 1, mode: "supply", layers: ["roads"], dataSource: "live",
    })
    expect(next.allowed).toBe(true)
    expect(memory.runs.find((run) => run.clientRunId === "stale")?.status).toBe("expired")
    expect(SESSION_IDLE_MS).toBeGreaterThan(0)
  })

  it("uses the loaded settings for the feedback trigger, trial limit, and survey version", () => {
    const memory = emptyMemory()
    memory.settings = { feedbackTriggerCount: 2, trialLimit: 2, surveyVersion: 4 }
    const { visitorId, sessionId } = open(memory, "2026-10-07T09:00:00.000Z")
    const first = succeed(memory, visitorId, sessionId, "2026-10-07T09:01:00.000Z", "04964")
    expect(first.finished.promptFeedback).toBe(false)
    const second = succeed(memory, visitorId, sessionId, "2026-10-07T09:02:00.000Z", "35167")
    expect(second.finished.promptFeedback).toBe(true)
    expect(second.finished.trialComplete).toBe(true)
    const blocked = applyBegin(memory, {
      now: "2026-10-07T09:03:00.000Z", privileged: false, visitorId, sessionId, clientRunId: "third",
      settlementKey: "x", settlementName: "x", municipality: "x", region: "x", lat: 1, lon: 1, mode: "supply", layers: [], dataSource: "live",
    })
    expect(blocked.allowed).toBe(false)
    const state = projectVisitor(memory, visitorId, false)
    expect(state.trialLimit).toBe(2)
    expect(state.feedbackTriggerCount).toBe(2)
    expect(state.surveyVersion).toBe(4)
    applySurvey(memory, { now: "2026-10-07T09:04:00.000Z", visitorId, sessionId, action: { type: "complete", answers: answers("not_now") } })
    expect(memory.surveys[0]?.surveyVersion).toBe(4)
    expect(memory.visitors[0]?.surveyVersion).toBe(4)
  })
})
