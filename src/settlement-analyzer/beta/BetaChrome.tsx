"use client"

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import type { Locale } from "@/lib/i18n"
import { href } from "@/lib/paths"
import { SURVEY_DRAFT_STORAGE_KEY, VISITOR_STORAGE_KEY } from "./config"
import { betaCopy } from "./copy"
import { emptySurveyAnswers, positiveBusinessInterest } from "./decisions"
import { BetaSurvey } from "./BetaSurvey"
import type { AnalysisAttemptContext, AnalysisOutcome, BetaPublicState, SurveyAnswers, SurveyStatus } from "./types"

type Dialog = "invite" | "complete" | "limit" | "survey" | null

type Gate = { proceed: boolean; clientRunId?: string; message?: string }

export function useBetaChrome(locale: Locale, privilegedHint: boolean, enabled = true) {
  const [state, setState] = useState<BetaPublicState | null>(null)
  const copy = betaCopy(locale, state?.trialLimit ?? null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [answers, setAnswers] = useState<SurveyAnswers>(emptySurveyAnswers())
  const [surveyStep, setSurveyStep] = useState(0)
  const [sending, setSending] = useState(false)
  const [surveyError, setSurveyError] = useState<string | null>(null)
  const [localSeen, setLocalSeen] = useState(false)
  const stateRef = useRef<BetaPublicState | null>(null)
  const announced = useRef<Dialog>(null)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const post = useCallback(async (body: Record<string, unknown>) => {
    const hint = window.localStorage.getItem(VISITOR_STORAGE_KEY)
    const response = await fetch("/api/settlement-analyzer/beta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(hint ? { "x-sa-beta-visitor": hint } : {}),
      },
      body: JSON.stringify({ ...body, context: collectContext(locale) }),
    })
    const payload = await response.json().catch(() => ({})) as {
      state?: BetaPublicState
      allowed?: boolean
      untracked?: boolean
      reason?: string | null
      clientRunId?: string
      promptFeedback?: boolean
      trialComplete?: boolean
      ok?: boolean
      error?: string
    }
    if (payload.state?.visitorId) {
      window.localStorage.setItem(VISITOR_STORAGE_KEY, payload.state.visitorId)
      setState(payload.state)
    }
    return { ok: response.ok, status: response.status, payload }
  }, [locale])

  useEffect(() => {
    if (!enabled) return
    const seen = window.sessionStorage.getItem("sa_beta_feedback_seen") === "1"
    setLocalSeen(seen)
    const draft = readDraft()
    if (draft) setAnswers(draft)
    void post({ action: "touch" }).then((result) => {
      if (result.payload.state?.draft && !draft) setAnswers(result.payload.state.draft)
    }).catch(() => undefined)
  }, [enabled, post])

  useEffect(() => {
    if (!dialog || announced.current === dialog) return
    announced.current = dialog
    if (dialog === "invite") {
      window.sessionStorage.setItem("sa_beta_feedback_seen", "1")
      setLocalSeen(true)
      void post({ action: "survey", surveyAction: "impression" })
    }
    if (dialog === "limit") void post({ action: "event", eventName: "trial_limit_modal_shown" })
    if (dialog === "survey") void post({ action: "survey", surveyAction: "start" })
  }, [dialog, post])

  const remember = (next: SurveyAnswers) => {
    setAnswers(next)
    window.sessionStorage.setItem(SURVEY_DRAFT_STORAGE_KEY, JSON.stringify(next))
  }

  const openSurvey = () => {
    setSurveyError(null)
    const draft = stateRef.current?.draft ?? readDraft()
    if (draft) setAnswers(draft)
    setDialog("survey")
  }

  const beforeAnalysis = useCallback(async (attempt: AnalysisAttemptContext): Promise<Gate> => {
    const clientRunId = crypto.randomUUID()
    try {
      const result = await post({
        action: "begin",
        clientRunId,
        settlementKey: attempt.settlementKey,
        settlementName: attempt.settlementName,
        municipality: attempt.municipality,
        region: attempt.region,
        lat: attempt.lat,
        lon: attempt.lon,
        mode: attempt.mode,
        dataSource: attempt.dataSource,
        layers: Object.entries(attempt.layers).filter(([, on]) => on).map(([key]) => key),
      })
      if (!result.ok) {
        if (privilegedHint || stateRef.current?.privileged) return { proceed: true }
        return { proceed: false, message: copy.unavailable }
      }
      if (result.payload.untracked) return { proceed: true }
      if (!result.payload.allowed) {
        setDialog("limit")
        return { proceed: false }
      }
      return { proceed: true, clientRunId: result.payload.clientRunId ?? clientRunId }
    } catch {
      if (privilegedHint || stateRef.current?.privileged) return { proceed: true }
      return { proceed: false, message: copy.unavailable }
    }
  }, [copy.unavailable, post, privilegedHint])

  const onSettled = useCallback(async (outcome: AnalysisOutcome) => {
    if (!outcome.clientRunId) return
    const send = () => post({
      action: "finish",
      clientRunId: outcome.clientRunId,
      status: outcome.status,
      errorCode: outcome.errorCode ?? null,
      errorCategory: outcome.errorCategory ?? null,
      durationMs: outcome.durationMs,
      summary: outcome.summary ?? {},
    })
    let result = await send().catch(() => null)
    if (!result?.ok) result = await send().catch(() => null)
    if (!result?.ok || !result.payload) return
    if (result.payload.promptFeedback) setDialog("invite")
    else if (result.payload.trialComplete) setDialog("complete")
  }, [post])

  const status: SurveyStatus = state?.surveyStatus ?? "never_seen"
  const verified = status === "completed_verified"
  const claimed = status === "already_completed_claimed"
  const showEntry = enabled && (localSeen || (state?.feedbackEntry ?? false))
  const interest = state?.businessInterest ?? null

  const feedbackSlot = showEntry ? (
    verified ? <span className="beta-feedback-entry beta-feedback-entry--done"><span className="beta-feedback-entry__full">{copy.entryDone}</span><span className="beta-feedback-entry__short">{copy.entryDoneShort}</span></span>
      : claimed ? <span className="beta-feedback-entry beta-feedback-entry--claimed"><span className="beta-feedback-entry__full">{copy.entryClaimed}</span><span className="beta-feedback-entry__short">{copy.entryClaimedShort}</span></span>
        : <button type="button" className="button beta-feedback-entry" onClick={openSurvey}><span className="beta-feedback-entry__full">{copy.entry}</span><span className="beta-feedback-entry__short">{copy.entryShort}</span></button>
  ) : null

  const dialogs = enabled ? (
    <>
      {dialog === "invite" ? (
        <Notice title={copy.inviteTitle} paragraphs={copy.inviteBody} disclosure={copy.disclosure}>
          <button type="button" className="button button--primary" onClick={openSurvey}>{copy.giveFeedback}</button>
          <button type="button" className="button" onClick={() => { void post({ action: "survey", surveyAction: "dismiss" }); setDialog(null) }}>{copy.continueTrial}</button>
          <button type="button" className="sa-beta-text-button" onClick={() => { void post({ action: "survey", surveyAction: "claim" }); setDialog(null) }}>{copy.alreadyCompleted}</button>
        </Notice>
      ) : null}
      {dialog === "complete" ? (
        <Notice title={copy.completeTitle} paragraphs={[copy.completeBody, copy.completeThanks, verified ? copy.completeAck : copy.completeFeedback]}>
          {verified ? <button type="button" className="button button--primary" onClick={() => setDialog(null)}>{copy.close}</button> : <button type="button" className="button button--primary" onClick={openSurvey}>{copy.giveFeedback}</button>}
          {!verified ? <button type="button" className="button" onClick={() => setDialog(null)}>{copy.close}</button> : null}
        </Notice>
      ) : null}
      {dialog === "limit" ? (
        <Notice title={copy.limitTitle} paragraphs={copy.limitBody}>
          {!verified ? <button type="button" className="button button--primary" onClick={openSurvey}>{copy.giveFeedback}</button> : null}
          {verified && positiveBusinessInterest(interest) ? <Link className="button" href={href(locale, "work-with-us")}>{copy.contactCta}</Link> : null}
          <button type="button" className="button" onClick={() => setDialog(null)}>{copy.close}</button>
        </Notice>
      ) : null}
      {dialog === "survey" ? (
        <BetaSurvey
          locale={locale}
          answers={answers}
          initialStep={surveyStep}
          sending={sending}
          error={surveyError}
          onChange={(next) => remember(next)}
          onStep={(step) => {
            setSurveyStep(step)
            void post({ action: "event", eventName: "survey_step_viewed", metadata: { step: step + 1 } })
            void post({ action: "survey", surveyAction: "draft", answers, step: step + 1 })
          }}
          onClose={(step) => {
            setSurveyStep(Math.max(0, step - 1))
            void post({ action: "survey", surveyAction: "abandon", step })
            setDialog(null)
          }}
          onComplete={async () => {
            setSending(true)
            setSurveyError(null)
            const result = await post({ action: "survey", surveyAction: "complete", answers }).catch(() => null)
            setSending(false)
            if (!result?.ok || result.payload.ok === false) {
              setSurveyError(copy.sendFailed)
              return false
            }
            window.sessionStorage.removeItem(SURVEY_DRAFT_STORAGE_KEY)
            return true
          }}
        />
      ) : null}
    </>
  ) : null

  return { beforeAnalysis, onSettled, feedbackSlot, dialogs }
}

function Notice({ title, paragraphs, disclosure, children }: { title: string; paragraphs: string[]; disclosure?: string; children: ReactNode }) {
  const titleId = useId()
  return (
    <div className="sa-modal-backdrop" role="presentation">
      <div className="sa-modal sa-beta-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="sa-modal__actions">{children}</div>
        {disclosure ? <p className="sa-beta-disclosure">{disclosure}</p> : null}
      </div>
    </div>
  )
}

function collectContext(locale: Locale) {
  const params = new URLSearchParams(window.location.search)
  return {
    landingPage: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    locale,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
  }
}

function readDraft(): SurveyAnswers | null {
  try {
    const raw = window.sessionStorage.getItem(SURVEY_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SurveyAnswers
    return parsed && typeof parsed === "object" ? { ...emptySurveyAnswers(), ...parsed } : null
  } catch {
    return null
  }
}
