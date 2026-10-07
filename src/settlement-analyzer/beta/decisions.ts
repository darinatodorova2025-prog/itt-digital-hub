import type { LayerVisibility } from "../components/layer-visibility"
import { SOFIA_TIME_ZONE } from "./config"
import {
  BUSINESS_INTERESTS,
  INTENDED_USE_CASES,
  REQUESTED_CAPABILITIES,
  ROLES,
  TIME_SINKS,
  WORK_FREQUENCIES,
  WORKFLOW_STAGES,
  labelFor,
  labelsFor,
} from "./options"
import type { BusinessInterest, StoredSurveyAnswers, SurveyAnswers, SurveyStatus } from "./types"

const LAYER_KEYS: Array<keyof LayerVisibility> = [
  "boundary",
  "residential",
  "industrial",
  "roads",
  "green",
  "water",
  "agricultural",
  "other",
  "buildings",
  "pois",
  "cadastre",
  "terrain",
]

export function sofiaDate(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SOFIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso))
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  return `${year}-${month}-${day}`
}

export function enabledLayers(layers: LayerVisibility) {
  return LAYER_KEYS.filter((key) => layers[key])
}

export function configFingerprint(input: {
  mode: string
  dataSource: string
  layers: string[]
  boundaryReason?: string | null
}) {
  return [
    input.mode,
    input.dataSource,
    [...input.layers].sort().join(","),
    input.boundaryReason ?? "",
  ].join("|")
}

export function emptySurveyAnswers(): SurveyAnswers {
  return {
    usefulnessScore: null,
    intendedUseCases: [],
    intendedUseOther: "",
    requestedCapabilities: [],
    requestedCapabilitiesOther: "",
    timeSink: "",
    timeSinkOther: "",
    automationNeed: "",
    role: "",
    roleOther: "",
    workFrequency: "",
    workflowStages: [],
    workflowStagesOther: "",
    businessInterest: "",
    contactName: "",
    contactOrganisation: "",
    contactEmail: "",
    contactPhone: "",
    contactTopic: "",
  }
}

export function isTerminalSurvey(status: SurveyStatus) {
  return status === "completed_verified" || status === "already_completed_claimed"
}

export function showsContact(interest: SurveyAnswers["businessInterest"]) {
  return interest === "discuss" || interest === "info"
}

export function positiveBusinessInterest(interest: BusinessInterest | null) {
  return interest === "discuss" || interest === "info"
}

export interface FinishFlagsInput {
  justSucceeded: boolean
  countsTowardTrial: boolean
  trialSuccessCount: number
  surveyStatus: SurveyStatus
  privileged: boolean
  feedbackTriggerCount: number
  trialLimit: number
}

export function finishFlags(input: FinishFlagsInput) {
  const trigger = input.feedbackTriggerCount
  const limit = input.trialLimit
  const counted = input.justSucceeded && input.countsTowardTrial && !input.privileged
  return {
    promptFeedback: counted && input.trialSuccessCount === trigger && !isTerminalSurvey(input.surveyStatus),
    trialComplete: counted && input.trialSuccessCount === limit,
    limitReached: !input.privileged && input.trialSuccessCount >= limit,
  }
}

export function claimStatus(hasCompletedResponse: boolean, current: SurveyStatus): SurveyStatus {
  if (hasCompletedResponse || current === "completed_verified") return "completed_verified"
  return "already_completed_claimed"
}

export function stepIssues(step: number, answers: SurveyAnswers): string[] {
  const issues: string[] = []
  if (step === 0) {
    if (!answers.usefulnessScore || answers.usefulnessScore < 1 || answers.usefulnessScore > 5) issues.push("usefulness")
    if (answers.intendedUseCases.length === 0) issues.push("intendedUseCases")
  }
  if (step === 1) {
    if (answers.requestedCapabilities.length === 0) issues.push("requestedCapabilities")
    if (!answers.timeSink) issues.push("timeSink")
  }
  if (step === 3) {
    if (!answers.role) issues.push("role")
    if (!answers.workFrequency) issues.push("workFrequency")
    if (answers.workflowStages.length === 0) issues.push("workflowStages")
  }
  if (step === 4) {
    if (!answers.businessInterest) issues.push("businessInterest")
    if (showsContact(answers.businessInterest) && answers.contactEmail.trim() && !isEmail(answers.contactEmail)) {
      issues.push("contactEmail")
    }
  }
  return issues
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim().toLowerCase())
}

export function canonicalizeSurvey(answers: SurveyAnswers): { ok: true; stored: StoredSurveyAnswers } | { ok: false; issues: string[] } {
  const issues = [0, 1, 2, 3, 4].flatMap((step) => stepIssues(step, answers))
  if (issues.length > 0) return { ok: false, issues }
  const interest = answers.businessInterest as BusinessInterest
  const contactWanted = showsContact(interest)
  const email = answers.contactEmail.trim().toLowerCase()
  return {
    ok: true,
    stored: {
      usefulness_score: answers.usefulnessScore,
      intended_use_cases: labelsFor(INTENDED_USE_CASES, answers.intendedUseCases),
      intended_use_other: blank(answers.intendedUseOther),
      requested_capabilities: labelsFor(REQUESTED_CAPABILITIES, answers.requestedCapabilities),
      requested_capabilities_other: blank(answers.requestedCapabilitiesOther),
      time_sink: labelFor(TIME_SINKS, answers.timeSink),
      time_sink_other: blank(answers.timeSinkOther),
      automation_need: blank(answers.automationNeed),
      role: labelFor(ROLES, answers.role),
      role_other: blank(answers.roleOther),
      organisation_work_frequency: labelFor(WORK_FREQUENCIES, answers.workFrequency),
      workflow_stages: labelsFor(WORKFLOW_STAGES, answers.workflowStages),
      workflow_stages_other: blank(answers.workflowStagesOther),
      business_interest: interest,
      business_interest_label: BUSINESS_INTERESTS.find((item) => item.value === interest)?.bg ?? null,
      contact: contactWanted
        ? {
            name: blank(answers.contactName),
            organisation: blank(answers.contactOrganisation),
            email: email ? email : null,
            phone: blank(answers.contactPhone),
            topic: blank(answers.contactTopic),
          }
        : null,
    },
  }
}

function blank(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function funnelRow(input: {
  trialSuccessCount: number
  impressionCount: number
  startCount: number
  surveyStatus: SurveyStatus
  hasCompletedResponse: boolean
  claimCount: number
  businessInterest: BusinessInterest | null
  leadEmail: string | null
  feedbackTriggerCount: number
  trialLimit: number
}) {
  const completed = input.hasCompletedResponse || input.surveyStatus === "completed_verified"
  return {
    openedTool: true,
    firstSuccessfulAnalysis: input.trialSuccessCount >= 1,
    thirdSuccessfulAnalysis: input.trialSuccessCount >= input.feedbackTriggerCount,
    feedbackPromptShown: input.impressionCount > 0,
    surveyStarted: input.startCount > 0,
    surveyCompleted: completed,
    alreadyCompletedClaimed: input.surveyStatus === "already_completed_claimed" && !completed,
    alreadyCompletedClaimCount: input.claimCount,
    fifthSuccessfulAnalysis: input.trialSuccessCount >= input.trialLimit,
    businessInterest: positiveBusinessInterest(input.businessInterest),
    leadSubmitted: Boolean(input.leadEmail && input.leadEmail.trim()),
  }
}
