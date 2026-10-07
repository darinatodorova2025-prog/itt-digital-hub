import { NextRequest, NextResponse } from "next/server"
import { assertSameOrigin, cleanText } from "@/settlement-analyzer/server/security"
import { sanitizeSurveyAnswers } from "@/settlement-analyzer/beta/sanitize"
import type { SurveyAction } from "@/settlement-analyzer/beta/engine"
import type { AnalysisDataSource } from "@/settlement-analyzer/beta/types"
import {
  abuseSignal,
  attributionFrom,
  authenticatedUserId,
  isPrivilegedRequest,
  isUuid,
  readBetaCookies,
  writeBetaCookies,
} from "@/settlement-analyzer/server/beta/http"
import { runBetaBegin, runBetaEvent, runBetaFinish, runBetaSurvey, runBetaTouch, TrialStoreUnavailableError } from "@/settlement-analyzer/server/beta/service"

export const runtime = "nodejs"

const LAYERS = ["boundary", "residential", "industrial", "roads", "green", "water", "agricultural", "other", "buildings", "pois", "cadastre", "terrain"]
const MODES = ["supply", "wastewater", "stormwater", "extension"]

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const body = await request.json() as Record<string, unknown>
    const action = cleanText(body.action, 40)
    const context = body.context && typeof body.context === "object" ? body.context as Record<string, unknown> : {}
    const now = new Date().toISOString()
    const privileged = await isPrivilegedRequest()
    const cookieIds = await readBetaCookies(request)
    const touch = {
      now,
      privileged,
      ...cookieIds,
      authenticatedUserId: await authenticatedUserId(),
      abuseSignal: abuseSignal(request),
      attribution: attributionFrom(request, { ...context, locale: context.locale }),
    }

    if (action === "touch") {
      const state = await runBetaTouch(touch)
      await writeBetaCookies(state.visitorId, state.sessionId)
      return NextResponse.json({ ok: true, state })
    }

    if (action === "begin") {
      const clientRunId = cleanText(body.clientRunId, 80)
      if (!isUuid(clientRunId)) return NextResponse.json({ error: "invalid_run" }, { status: 400 })
      try {
        const result = await runBetaBegin({
          ...touch,
          clientRunId,
          settlementKey: cleanText(body.settlementKey, 80),
          settlementName: cleanText(body.settlementName, 140),
          municipality: cleanText(body.municipality, 140),
          region: cleanText(body.region, 140),
          lat: finite(body.lat) ?? 0,
          lon: finite(body.lon) ?? 0,
          mode: oneOf(body.mode, MODES, "supply"),
          layers: layersOf(body.layers),
          dataSource: oneOf(body.dataSource, ["pack", "live"], "live") as AnalysisDataSource,
        })
        await writeBetaCookies(result.state.visitorId, result.state.sessionId)
        return NextResponse.json({
          ok: true,
          allowed: result.allowed,
          duplicate: result.duplicate,
          reason: result.reason ?? null,
          clientRunId: result.clientRunId,
          state: result.state,
        })
      } catch (error) {
        if (error instanceof TrialStoreUnavailableError && privileged) {
          return NextResponse.json({ ok: true, allowed: true, untracked: true, clientRunId })
        }
        throw error
      }
    }

    if (action === "finish") {
      const clientRunId = cleanText(body.clientRunId, 80)
      if (!isUuid(clientRunId)) return NextResponse.json({ error: "invalid_run" }, { status: 400 })
      const status = oneOf(body.status, ["success", "failure", "cancelled"], "failure") as "success" | "failure" | "cancelled"
      const summary = body.summary && typeof body.summary === "object" ? body.summary as Record<string, unknown> : {}
      const result = await runBetaFinish({
        ...touch,
        clientRunId,
        status,
        errorCode: cleanText(body.errorCode, 80) || null,
        errorCategory: cleanText(body.errorCategory, 80) || null,
        durationMs: finite(body.durationMs),
        summary: {
          areaKm2: finite(summary.areaKm2) ?? undefined,
          buildings: finite(summary.buildings) ?? undefined,
          roadLengthKm: finite(summary.roadLengthKm) ?? undefined,
          confidence: cleanText(summary.confidence, 40),
          profile: cleanText(summary.profile, 80),
          boundaryReason: cleanText(summary.boundaryReason, 80),
          warnings: Array.isArray(summary.warnings) ? summary.warnings.filter((item): item is string => typeof item === "string").slice(0, 12) : [],
          dataSource: cleanText(summary.dataSource, 20),
        },
      })
      await writeBetaCookies(result.state.visitorId, result.state.sessionId)
      return NextResponse.json({
        ok: true,
        recorded: result.recorded,
        duplicate: result.duplicate,
        promptFeedback: result.promptFeedback,
        trialComplete: result.trialComplete,
        limitReached: result.limitReached,
        state: result.state,
      })
    }

    if (action === "survey") {
      const surveyAction = surveyActionFrom(body)
      if (!surveyAction) return NextResponse.json({ error: "invalid_survey" }, { status: 400 })
      const result = await runBetaSurvey({ ...touch, action: surveyAction })
      await writeBetaCookies(result.state.visitorId, result.state.sessionId)
      return NextResponse.json({ ok: result.ok, issues: result.issues ?? [], state: result.state })
    }

    if (action === "event") {
      const eventName = cleanText(body.eventName, 80)
      if (eventName !== "trial_limit_modal_shown" && eventName !== "survey_step_viewed") {
        return NextResponse.json({ error: "invalid_event" }, { status: 400 })
      }
      const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata as Record<string, unknown> : {}
      const step = finite(metadata.step)
      const state = await runBetaEvent({
        ...touch,
        eventName,
        metadata: step ? { step } : {},
      })
      await writeBetaCookies(state.visitorId, state.sessionId)
      return NextResponse.json({ ok: true, state })
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 })
  } catch (error) {
    if (error instanceof TrialStoreUnavailableError) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 })
    }
    const message = error instanceof Error ? error.message : ""
    if (message === "Невалидна заявка.") return NextResponse.json({ error: "invalid_origin" }, { status: 403 })
    console.error("[settlement-analyzer] beta request failed")
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

function surveyActionFrom(body: Record<string, unknown>): SurveyAction | null {
  const type = cleanText(body.surveyAction, 40)
  const step = finite(body.step) ?? 1
  if (type === "impression") return { type: "impression" }
  if (type === "dismiss") return { type: "dismiss" }
  if (type === "start") return { type: "start" }
  if (type === "draft") return { type: "draft", answers: sanitizeSurveyAnswers(body.answers), step }
  if (type === "abandon") return { type: "abandon", step }
  if (type === "claim") return { type: "claim" }
  if (type === "complete") return { type: "complete", answers: sanitizeSurveyAnswers(body.answers) }
  return null
}

function layersOf(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && LAYERS.includes(item))
}

function oneOf(value: unknown, allowed: string[], fallback: string) {
  const text = cleanText(value, 40)
  return allowed.includes(text) ? text : fallback
}

function finite(value: unknown) {
  const number = typeof value === "number" ? value : Number.NaN
  return Number.isFinite(number) ? number : null
}
