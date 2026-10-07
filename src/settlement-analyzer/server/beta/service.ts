import "server-only"

import { supabaseServiceRoleConfigured } from "@/lib/cms/supabase-service"
import type { BeginInput, FinishInput, SurveyAction, TouchInput } from "@/settlement-analyzer/beta/engine"
import { createFileBetaStore, TrialStoreUnavailableError, type BetaStore } from "./file-store"
import { betaTablesAvailable, createSupabaseBetaStore } from "./supabase-store"

const fileStore = createFileBetaStore()
const supabaseStore = createSupabaseBetaStore()
let supabaseReady = false
let warnedAboutFileStore = false

export async function getBetaStore(): Promise<BetaStore> {
  if (process.env.SA_BETA_STORE === "file" || !supabaseServiceRoleConfigured()) {
    if (process.env.VERCEL && !supabaseServiceRoleConfigured()) throw new TrialStoreUnavailableError()
    return fileStore
  }
  if (supabaseReady || await betaTablesAvailable()) {
    supabaseReady = true
    return supabaseStore
  }
  if (process.env.VERCEL) throw new TrialStoreUnavailableError()
  if (!warnedAboutFileStore) {
    warnedAboutFileStore = true
    console.warn("[settlement-analyzer] Beta tables are not available yet. Local file store is recording the trial.")
  }
  return fileStore
}

export async function runBetaTouch(input: TouchInput) {
  const store = await getBetaStore()
  return store.touch(input)
}

export async function runBetaBegin(input: TouchInput & Omit<BeginInput, "visitorId" | "sessionId">) {
  const store = await getBetaStore()
  const state = await store.touch(input)
  return store.begin({ ...input, visitorId: state.visitorId, sessionId: state.sessionId })
}

export async function runBetaFinish(input: TouchInput & Omit<FinishInput, "visitorId"> & { visitorId?: string }) {
  const store = await getBetaStore()
  const state = await store.touch(input)
  return store.finish({ ...input, visitorId: state.visitorId })
}

export async function runBetaSurvey(input: TouchInput & { action: SurveyAction }) {
  const store = await getBetaStore()
  const state = await store.touch(input)
  return store.survey({ now: input.now, privileged: input.privileged, visitorId: state.visitorId, sessionId: state.sessionId, action: input.action })
}

export async function runBetaEvent(input: TouchInput & { eventName: "trial_limit_modal_shown" | "survey_step_viewed"; metadata?: Record<string, unknown> }) {
  const store = await getBetaStore()
  const state = await store.touch(input)
  return store.event({
    now: input.now,
    privileged: input.privileged,
    visitorId: state.visitorId,
    sessionId: state.sessionId,
    eventName: input.eventName,
    metadata: input.metadata,
  })
}

export { TrialStoreUnavailableError }
