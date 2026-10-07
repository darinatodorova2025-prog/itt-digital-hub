"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { Locale } from "@/lib/i18n"
import { betaCopy } from "./copy"
import { isEmail, showsContact, stepIssues } from "./decisions"
import {
  BUSINESS_INTERESTS,
  INTENDED_USE_CASES,
  REQUESTED_CAPABILITIES,
  ROLES,
  TIME_SINKS,
  WORK_FREQUENCIES,
  WORKFLOW_STAGES,
  optionLabel,
  type BetaOption,
} from "./options"
import type { SurveyAnswers } from "./types"

const STEPS = 5

export function BetaSurvey({
  locale,
  answers,
  initialStep = 0,
  onChange,
  onClose,
  onComplete,
  sending,
  error,
  onStep,
}: {
  locale: Locale
  answers: SurveyAnswers
  initialStep?: number
  onChange: (answers: SurveyAnswers) => void
  onClose: (step: number) => void
  onComplete: () => Promise<boolean>
  sending: boolean
  error: string | null
  onStep?: (step: number) => void
}) {
  const copy = betaCopy(locale, null)
  const titleId = useId()
  const [step, setStep] = useState(initialStep)
  const [issues, setIssues] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const onStepRef = useRef(onStep)
  useEffect(() => {
    onStepRef.current = onStep
  }, [onStep])

  useEffect(() => {
    onStepRef.current?.(step)
  }, [step])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(step + 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, step])

  const patch = (partial: Partial<SurveyAnswers>) => onChange({ ...answers, ...partial })
  const advance = async () => {
    const nextIssues = stepIssues(step, answers)
    setIssues(nextIssues)
    if (nextIssues.length > 0) return
    if (step < STEPS - 1) {
      setStep(step + 1)
      setIssues([])
      return
    }
    if (await onComplete()) setDone(true)
  }

  return (
    <div className="sa-modal-backdrop" role="presentation">
      <div className="sa-modal sa-beta-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <p className="sa-beta-progress">{copy.progress(done ? STEPS : step + 1, STEPS)}</p>
        <h2 id={titleId}>{done ? copy.thanksTitle : stepTitle(copy, step)}</h2>
        {done ? <p>{copy.thanksBody}</p> : <SurveyStep locale={locale} step={step} answers={answers} onChange={patch} />}
        {issues.length > 0 ? <p className="sa-beta-error" role="alert">{issues.includes("contactEmail") ? copy.invalidEmail : copy.required}</p> : null}
        {error ? <p className="sa-beta-error" role="alert">{error}</p> : null}
        <div className="sa-modal__actions">
          {done ? (
            <button type="button" className="button button--primary" onClick={() => onClose(STEPS)}>{copy.close}</button>
          ) : (
            <>
              {step > 0 ? <button type="button" className="button" onClick={() => { setStep(step - 1); setIssues([]) }}>{copy.back}</button> : null}
              <button type="button" className="button button--primary" disabled={sending} onClick={advance}>{step === STEPS - 1 ? copy.send : copy.next}</button>
            </>
          )}
        </div>
        <p className="sa-beta-disclosure">{copy.disclosure}</p>
        {!done ? <button type="button" className="sa-beta-text-button" onClick={() => onClose(step + 1)}>{copy.close}</button> : null}
      </div>
    </div>
  )
}

function stepTitle(copy: ReturnType<typeof betaCopy>, step: number) {
  if (step === 0) return copy.usefulness
  if (step === 1) return copy.capabilities
  if (step === 2) return copy.automation
  if (step === 3) return copy.role
  return copy.interest
}

function SurveyStep({
  locale,
  step,
  answers,
  onChange,
}: {
  locale: Locale
  step: number
  answers: SurveyAnswers
  onChange: (partial: Partial<SurveyAnswers>) => void
}) {
  const copy = betaCopy(locale, null)
  if (step === 0) {
    return (
      <>
        <Scale locale={locale} value={answers.usefulnessScore} onChange={(usefulnessScore) => onChange({ usefulnessScore })} />
        <fieldset className="sa-beta-field">
          <legend>{copy.intendedUse}</legend>
          <Chips locale={locale} options={INTENDED_USE_CASES} selected={answers.intendedUseCases} onChange={(intendedUseCases) => onChange({ intendedUseCases })} />
          {answers.intendedUseCases.includes("other") ? <OptionalText locale={locale} value={answers.intendedUseOther} onChange={(intendedUseOther) => onChange({ intendedUseOther })} /> : null}
        </fieldset>
      </>
    )
  }
  if (step === 1) {
    return (
      <>
        <Chips locale={locale} options={REQUESTED_CAPABILITIES} selected={answers.requestedCapabilities} onChange={(requestedCapabilities) => onChange({ requestedCapabilities })} />
        {answers.requestedCapabilities.includes("other") ? <OptionalText locale={locale} value={answers.requestedCapabilitiesOther} onChange={(requestedCapabilitiesOther) => onChange({ requestedCapabilitiesOther })} /> : null}
        <fieldset className="sa-beta-field">
          <legend>{copy.timeSink}</legend>
          <RadioList locale={locale} name="time-sink" options={TIME_SINKS} value={answers.timeSink} onChange={(timeSink) => onChange({ timeSink })} />
          {answers.timeSink === "other" ? <OptionalText locale={locale} value={answers.timeSinkOther} onChange={(timeSinkOther) => onChange({ timeSinkOther })} /> : null}
        </fieldset>
      </>
    )
  }
  if (step === 2) {
    return (
      <label className="sa-beta-field">
        <span>{copy.automation} <em>({copy.optional})</em></span>
        <textarea rows={5} maxLength={2000} value={answers.automationNeed} onChange={(event) => onChange({ automationNeed: event.target.value })} />
      </label>
    )
  }
  if (step === 3) {
    return (
      <>
        <RadioList locale={locale} name="role" options={ROLES} value={answers.role} onChange={(role) => onChange({ role })} />
        {answers.role === "other" ? <OptionalText locale={locale} value={answers.roleOther} onChange={(roleOther) => onChange({ roleOther })} /> : null}
        <fieldset className="sa-beta-field">
          <legend>{copy.frequency}</legend>
          <RadioList locale={locale} name="frequency" options={WORK_FREQUENCIES} value={answers.workFrequency} onChange={(workFrequency) => onChange({ workFrequency })} />
        </fieldset>
        <fieldset className="sa-beta-field">
          <legend>{copy.stages}</legend>
          <Chips locale={locale} options={WORKFLOW_STAGES} selected={answers.workflowStages} onChange={(workflowStages) => onChange({ workflowStages })} />
          {answers.workflowStages.includes("other") ? <OptionalText locale={locale} value={answers.workflowStagesOther} onChange={(workflowStagesOther) => onChange({ workflowStagesOther })} /> : null}
        </fieldset>
      </>
    )
  }
  const showContact = showsContact(answers.businessInterest)
  return (
    <>
      <RadioList locale={locale} name="interest" options={BUSINESS_INTERESTS} value={answers.businessInterest} onChange={(businessInterest) => onChange({ businessInterest: businessInterest as SurveyAnswers["businessInterest"] })} />
      {showContact ? (
        <div className="sa-beta-contact">
          <h3>{copy.contactHeading}</h3>
          <label>{copy.name}<input value={answers.contactName} onChange={(event) => onChange({ contactName: event.target.value })} autoComplete="name" /></label>
          <label>{copy.organisation}<input value={answers.contactOrganisation} onChange={(event) => onChange({ contactOrganisation: event.target.value })} autoComplete="organization" /></label>
          <label>{copy.email} <em>({copy.optional})</em><input type="email" inputMode="email" value={answers.contactEmail} onChange={(event) => onChange({ contactEmail: event.target.value })} autoComplete="email" aria-invalid={Boolean(answers.contactEmail) && !isEmail(answers.contactEmail)} /></label>
          <label>{copy.phone} <em>({copy.optional})</em><input value={answers.contactPhone} onChange={(event) => onChange({ contactPhone: event.target.value })} autoComplete="tel" /></label>
          <label>{copy.topic} <em>({copy.optional})</em><textarea rows={3} maxLength={1000} value={answers.contactTopic} onChange={(event) => onChange({ contactTopic: event.target.value })} /></label>
        </div>
      ) : null}
    </>
  )
}

function Scale({ locale, value, onChange }: { locale: Locale; value: number | null; onChange: (value: number) => void }) {
  const copy = betaCopy(locale, null)
  return (
    <div className="sa-beta-scale" role="radiogroup" aria-label={copy.usefulness}>
      {[1, 2, 3, 4, 5].map((score) => (
        <button key={score} type="button" role="radio" aria-checked={value === score} className={value === score ? "is-selected" : ""} onClick={() => onChange(score)}>
          {score}
        </button>
      ))}
      <span>{copy.usefulnessLow}</span>
      <span>{copy.usefulnessHigh}</span>
    </div>
  )
}

function Chips({ locale, options, selected, onChange }: { locale: Locale; options: BetaOption[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const language = locale === "bg" ? "bg" : "en"
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  return (
    <div className="sa-beta-chips">
      {options.map((option) => (
        <button key={option.id} type="button" aria-pressed={selected.includes(option.id)} className={selected.includes(option.id) ? "is-selected" : ""} onClick={() => toggle(option.id)}>
          {optionLabel(options, option.id, language)}
        </button>
      ))}
    </div>
  )
}

function RadioList({
  locale,
  name,
  options,
  value,
  onChange,
}: {
  locale: Locale
  name: string
  options: BetaOption[]
  value: string
  onChange: (id: string) => void
}) {
  const language = locale === "bg" ? "bg" : "en"
  return (
    <div className="sa-beta-radios" role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <label key={option.id}>
          <input type="radio" name={name} checked={value === option.id} onChange={() => onChange(option.id)} />
          <span>{optionLabel(options, option.id, language)}</span>
        </label>
      ))}
    </div>
  )
}

function OptionalText({ locale, value, onChange }: { locale: Locale; value: string; onChange: (value: string) => void }) {
  const copy = betaCopy(locale, null)
  return <input className="sa-beta-other" aria-label={copy.otherPlaceholder} placeholder={copy.otherPlaceholder} maxLength={200} value={value} onChange={(event) => onChange(event.target.value)} />
}
