import type { LayerVisibility } from "../components/layer-visibility"

export type SurveyStatus =
  | "never_seen"
  | "shown"
  | "dismissed_continue"
  | "started"
  | "completed_verified"
  | "already_completed_claimed"

export type RunStatus = "started" | "success" | "failure" | "cancelled" | "expired"

export type BusinessInterest = "discuss" | "info" | "not_now"

export type AnalysisDataSource = "pack" | "live"

export interface AnalysisAttemptContext {
  settlementKey: string
  settlementName: string
  municipality: string
  region: string
  ekatte: string | null
  lat: number
  lon: number
  mode: string
  layers: LayerVisibility
  dataSource: AnalysisDataSource
}

export interface AnalysisOutcome {
  clientRunId?: string
  status: "success" | "failure" | "cancelled"
  errorCode?: string
  errorCategory?: string
  durationMs: number
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

export interface SurveyAnswers {
  usefulnessScore: number | null
  intendedUseCases: string[]
  intendedUseOther: string
  requestedCapabilities: string[]
  requestedCapabilitiesOther: string
  timeSink: string
  timeSinkOther: string
  automationNeed: string
  role: string
  roleOther: string
  workFrequency: string
  workflowStages: string[]
  workflowStagesOther: string
  businessInterest: "" | BusinessInterest
  contactName: string
  contactOrganisation: string
  contactEmail: string
  contactPhone: string
  contactTopic: string
}

export interface StoredSurveyAnswers {
  usefulness_score: number | null
  intended_use_cases: string[]
  intended_use_other: string | null
  requested_capabilities: string[]
  requested_capabilities_other: string | null
  time_sink: string | null
  time_sink_other: string | null
  automation_need: string | null
  role: string | null
  role_other: string | null
  organisation_work_frequency: string | null
  workflow_stages: string[]
  workflow_stages_other: string | null
  business_interest: BusinessInterest | null
  business_interest_label: string | null
  contact: {
    name: string | null
    organisation: string | null
    email: string | null
    phone: string | null
    topic: string | null
  } | null
}

export interface BetaPublicState {
  privileged: boolean
  visitorId: string
  sessionId: string
  successCount: number
  trialSuccessCount: number
  failureCount: number
  attemptCount: number
  sessionCount: number
  distinctActiveDays: number
  distinctSettlementCount: number
  repeatSameSettlementCount: number
  configurationVariation: number
  surveyStatus: SurveyStatus
  surveyImpressionCount: number
  surveyStartCount: number
  surveyCompletionCount: number
  alreadyCompletedClaimCount: number
  businessInterest: BusinessInterest | null
  feedbackEntry: boolean
  limitReached: boolean
  trialLimit: number
  feedbackTriggerCount: number
  surveyVersion: number
  draft: SurveyAnswers | null
}
