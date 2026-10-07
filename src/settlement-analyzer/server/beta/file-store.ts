import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  applyBegin,
  applyClientEvent,
  applyFinish,
  applySurvey,
  applyTouch,
  emptyMemory,
  projectVisitor,
  type BeginInput,
  type BetaMemory,
  type FinishInput,
  type SurveyAction,
  type TouchInput,
} from "@/settlement-analyzer/beta/engine"
import { BETA_SETTINGS_DEFAULTS, type BetaSettings } from "@/settlement-analyzer/beta/config"
import type { BetaPublicState } from "@/settlement-analyzer/beta/types"

export class TrialStoreUnavailableError extends Error {
  constructor() {
    super("Beta trial store is unavailable")
    this.name = "TrialStoreUnavailableError"
  }
}

export interface BeginResult {
  allowed: boolean
  duplicate: boolean
  reason?: "trial_limit"
  clientRunId: string
  state: BetaPublicState
}

export interface FinishResult {
  recorded: boolean
  duplicate: boolean
  promptFeedback: boolean
  trialComplete: boolean
  limitReached: boolean
  state: BetaPublicState
}

export interface BetaStore {
  touch(input: TouchInput): Promise<BetaPublicState>
  begin(input: BeginInput & TouchInput): Promise<BeginResult>
  finish(input: FinishInput): Promise<FinishResult>
  survey(input: { now: string; privileged: boolean; visitorId: string; sessionId: string; action: SurveyAction }): Promise<{ ok: boolean; issues?: string[]; state: BetaPublicState }>
  event(input: { now: string; privileged: boolean; visitorId: string; sessionId: string; eventName: "trial_limit_modal_shown" | "survey_step_viewed"; metadata?: Record<string, unknown> }): Promise<BetaPublicState>
}

export function createMemoryBetaStore(memory = emptyMemory()): BetaStore {
  let queue: Promise<unknown> = Promise.resolve()
  const locked = <T>(fn: () => T): Promise<T> => {
    const run = queue.then(fn, fn)
    queue = run.then(() => undefined, () => undefined)
    return run
  }
  return {
    touch: (input) => locked(() => {
      const { visitorId } = applyTouch(memory, input)
      return projectVisitor(memory, visitorId, input.privileged)
    }),
    begin: (input: BeginInput & TouchInput) => locked(() => {
      const result = applyBegin(memory, input)
      return {
        allowed: result.allowed,
        duplicate: result.duplicate,
        reason: result.reason === "trial_limit" ? "trial_limit" : undefined,
        clientRunId: input.clientRunId,
        state: projectVisitor(memory, input.visitorId, input.privileged),
      }
    }),
    finish: (input) => locked(() => {
      const result = applyFinish(memory, input)
      return { ...result, state: projectVisitor(memory, input.visitorId, input.privileged) }
    }),
    survey: (input) => locked(() => {
      const result = applySurvey(memory, input)
      return {
        ok: result.ok,
        issues: "issues" in result ? result.issues : undefined,
        state: projectVisitor(memory, input.visitorId, input.privileged),
      }
    }),
    event: (input) => locked(() => {
      applyClientEvent(memory, input)
      return projectVisitor(memory, input.visitorId, input.privileged)
    }),
  }
}

export function createFileBetaStore(filePath = defaultFilePath()): BetaStore {
  let queue: Promise<unknown> = Promise.resolve()
  const locked = <T>(fn: (memory: BetaMemory) => T | Promise<T>): Promise<T> => {
    const run = queue.then(async () => {
      const memory = await readMemory(filePath)
      const result = await fn(memory)
      await writeMemory(filePath, memory)
      return result
    }, async () => {
      const memory = await readMemory(filePath)
      const result = await fn(memory)
      await writeMemory(filePath, memory)
      return result
    })
    queue = run.then(() => undefined, () => undefined)
    return run
  }
  const memoryStore = {
    touch: (input: TouchInput) => locked((memory) => {
      const { visitorId } = applyTouch(memory, input)
      return projectVisitor(memory, visitorId, input.privileged)
    }),
    begin: (input: BeginInput & TouchInput) => locked((memory) => {
      const result = applyBegin(memory, input)
      return {
        allowed: result.allowed,
        duplicate: result.duplicate,
        reason: result.reason === "trial_limit" ? "trial_limit" as const : undefined,
        clientRunId: input.clientRunId,
        state: projectVisitor(memory, input.visitorId, input.privileged),
      }
    }),
    finish: (input: FinishInput) => locked((memory) => {
      const result = applyFinish(memory, input)
      return { ...result, state: projectVisitor(memory, input.visitorId, input.privileged) }
    }),
    survey: (input: { now: string; privileged: boolean; visitorId: string; sessionId: string; action: SurveyAction }) => locked((memory) => {
      const result = applySurvey(memory, input)
      return {
        ok: result.ok,
        issues: "issues" in result ? result.issues : undefined,
        state: projectVisitor(memory, input.visitorId, input.privileged),
      }
    }),
    event: (input: { now: string; privileged: boolean; visitorId: string; sessionId: string; eventName: "trial_limit_modal_shown" | "survey_step_viewed"; metadata?: Record<string, unknown> }) => locked((memory) => {
      applyClientEvent(memory, input)
      return projectVisitor(memory, input.visitorId, input.privileged)
    }),
  }
  return memoryStore
}

function defaultFilePath() {
  return process.env.SA_BETA_STORE_PATH?.trim() || path.join(process.cwd(), ".data", "sa-beta-store.json")
}

async function readMemory(filePath: string): Promise<BetaMemory> {
  try {
    const raw = await readFile(filePath, "utf8")
    const parsed = JSON.parse(raw) as BetaMemory
    if (!parsed || !Array.isArray(parsed.visitors) || !Array.isArray(parsed.runs)) throw new TrialStoreUnavailableError()
    return {
      settings: settingsFrom(parsed.settings),
      visitors: parsed.visitors,
      sessions: parsed.sessions ?? [],
      runs: parsed.runs,
      events: parsed.events ?? [],
      surveys: parsed.surveys ?? [],
      leads: parsed.leads ?? [],
    }
  } catch (error) {
    if (error instanceof TrialStoreUnavailableError) throw error
    if (isNodeError(error) && error.code === "ENOENT") return emptyMemory()
    throw new TrialStoreUnavailableError()
  }
}

async function writeMemory(filePath: string, memory: BetaMemory) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify(memory))
  const { rename } = await import("node:fs/promises")
  await rename(temporary, filePath)
}

function settingsFrom(value: unknown): BetaSettings {
  if (!value || typeof value !== "object") return { ...BETA_SETTINGS_DEFAULTS }
  const row = value as Partial<BetaSettings>
  const feedbackTriggerCount = positiveInteger(row.feedbackTriggerCount)
  const trialLimit = positiveInteger(row.trialLimit)
  const surveyVersion = positiveInteger(row.surveyVersion)
  if (feedbackTriggerCount == null || trialLimit == null || surveyVersion == null) return { ...BETA_SETTINGS_DEFAULTS }
  return { feedbackTriggerCount, trialLimit, surveyVersion }
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === "object" && "code" in error)
}
