import {
  BUSINESS_INTERESTS,
  INTENDED_USE_CASES,
  REQUESTED_CAPABILITIES,
  ROLES,
  TIME_SINKS,
  WORK_FREQUENCIES,
  WORKFLOW_STAGES,
} from "./options"
import { emptySurveyAnswers } from "./decisions"
import type { BusinessInterest, SurveyAnswers } from "./types"

const INTERESTS = new Set<BusinessInterest>(BUSINESS_INTERESTS.map((item) => item.value))

export function sanitizeSurveyAnswers(value: unknown): SurveyAnswers {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const interest = raw.businessInterest
  return {
    usefulnessScore: score(raw.usefulnessScore),
    intendedUseCases: ids(raw.intendedUseCases, INTENDED_USE_CASES),
    intendedUseOther: clip(raw.intendedUseOther, 200),
    requestedCapabilities: ids(raw.requestedCapabilities, REQUESTED_CAPABILITIES),
    requestedCapabilitiesOther: clip(raw.requestedCapabilitiesOther, 200),
    timeSink: one(raw.timeSink, TIME_SINKS),
    timeSinkOther: clip(raw.timeSinkOther, 200),
    automationNeed: clip(raw.automationNeed, 2000),
    role: one(raw.role, ROLES),
    roleOther: clip(raw.roleOther, 200),
    workFrequency: one(raw.workFrequency, WORK_FREQUENCIES),
    workflowStages: ids(raw.workflowStages, WORKFLOW_STAGES),
    workflowStagesOther: clip(raw.workflowStagesOther, 200),
    businessInterest: typeof interest === "string" && INTERESTS.has(interest as BusinessInterest) ? interest as BusinessInterest : "",
    contactName: clip(raw.contactName, 120),
    contactOrganisation: clip(raw.contactOrganisation, 160),
    contactEmail: clip(raw.contactEmail, 180),
    contactPhone: clip(raw.contactPhone, 40),
    contactTopic: clip(raw.contactTopic, 1000),
  }
}

function score(value: unknown) {
  const number = typeof value === "number" ? value : Number.NaN
  if (!Number.isInteger(number) || number < 1 || number > 5) return null
  return number
}

function ids(value: unknown, options: ReadonlyArray<{ id: string }>) {
  if (!Array.isArray(value)) return []
  const allowed = new Set(options.map((option) => option.id))
  return [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))].slice(0, options.length)
}

function one(value: unknown, options: ReadonlyArray<{ id: string }>) {
  return typeof value === "string" && options.some((option) => option.id === value) ? value : ""
}

function clip(value: unknown, max: number) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
  return text.slice(0, max)
}

export function blankSurvey() {
  return emptySurveyAnswers()
}
