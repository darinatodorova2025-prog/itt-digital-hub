/**
 * Seed values for sa_beta_settings.
 * Runtime decisions read the loaded settings row. These numbers are only the
 * insert defaults and the local file-store seed when that row has not been stored yet.
 */
export interface BetaSettings {
  feedbackTriggerCount: number
  trialLimit: number
  surveyVersion: number
}

export const BETA_SETTINGS_DEFAULTS: BetaSettings = {
  feedbackTriggerCount: 3,
  trialLimit: 5,
  surveyVersion: 1,
}

export const APP_VERSION = "0.1.0"
export const ANALYSIS_ENGINE_VERSION = "settlement-analyzer-1"

/** A started run that never finishes releases its reserved trial slot after this long. */
export const RUN_RESERVATION_TTL_MS = 10 * 60 * 1000

/** A new session starts after this much inactivity. */
export const SESSION_IDLE_MS = 30 * 60 * 1000

export const VISITOR_COOKIE = "sa_beta_visitor_id"
export const SESSION_COOKIE = "sa_beta_session_id"
export const VISITOR_STORAGE_KEY = "sa_beta_visitor_id"
export const SURVEY_DRAFT_STORAGE_KEY = "sa_beta_survey_draft_v1"

export const SOFIA_TIME_ZONE = "Europe/Sofia"
