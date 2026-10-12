import "server-only";

import { createSupabaseServiceClient, supabaseServiceRoleConfigured } from "@/lib/cms/supabase-service";
import {
  BUSINESS_INTERESTS,
  INTENDED_USE_CASES,
  REQUESTED_CAPABILITIES,
  ROLES,
  TIME_SINKS,
  WORK_FREQUENCIES,
  WORKFLOW_STAGES,
} from "@/settlement-analyzer/beta/options";
import type { StoredSurveyAnswers } from "@/settlement-analyzer/beta/types";
import { calculateLeadScore } from "@/settlement-analyzer/conference/lead-scoring";
import { StoreUnavailableError } from "./store";

export type AdminLead = {
  id: string
  fullName: string
  email: string
  phone: string | null
  jobRole: string | null
  companyName: string
  website: string | null
  organizationType: string
  employeeRange: string | null
  city: string | null
  useCases: string[]
  painPoints: string[]
  projectTimeline: string | null
  contactInterest: string | null
  profileCompleted: boolean
  createdAt: string
  lastSeenAt: string
  source: string
  utmCampaign: string | null
  utmContent: string | null
  sessionCount: number
  analysisCount: number
  settlements: string[]
  score: number
  status: string
  scoreBreakdown: Array<{ label: string; points: number }>
  marketingConsent: boolean
}

export type AdminSnapshot = {
  leads: AdminLead[]
  kpis: {
    visits: number
    registrations: number
    registrationConversion: number
    usersWithAnalysis: number
    analyses: number
    returnVisitors: number
    completedProfiles: number
    highPotential: number
    contactRequests: number
  }
  funnel: Array<{ label: string; value: number }>
  survey: SurveySummary
}

export type SurveyChoice = { label: string; count: number }

export type SurveyNote = { text: string; at: string }

export type SurveyGroup = {
  title: string
  scale: boolean
  hint?: string
  choices: SurveyChoice[]
  notes: SurveyNote[]
}

export type SurveySummary = {
  completed: number
  groups: SurveyGroup[]
}

type VisitorRow = {
  id: string
  first_seen_at: string
  last_seen_at: string
  utm_source: string | null
  utm_campaign: string | null
  utm_content: string | null
  survey_status: string
}

type LeadRow = {
  id: string
  visitor_id: string
  business_interest: string
  name: string | null
  organisation: string | null
  email: string | null
  phone: string | null
  role: string | null
  organisation_work_frequency: string | null
  intended_use_cases: unknown
  requested_capabilities: unknown
  what_they_want_to_discuss: string | null
  acquisition_source: string | null
  utm_campaign: string | null
  created_at: string
}

type SurveyRow = {
  visitorId: string
  completedAt: string | null
  answers: unknown
}

export function buildAdminSnapshot(input: {
  visitors: VisitorRow[]
  sessionVisitorIds: string[]
  successfulRuns: Array<{ visitorId: string; settlementName: string | null }>
  leads: LeadRow[]
  surveys: SurveyRow[]
}): AdminSnapshot {
  const sessions = countBy(input.sessionVisitorIds)
  const runs = new Map<string, { count: number; settlements: string[] }>()
  for (const run of input.successfulRuns) {
    const current = runs.get(run.visitorId) ?? { count: 0, settlements: [] }
    current.count += 1
    if (run.settlementName && !current.settlements.includes(run.settlementName)) current.settlements.push(run.settlementName)
    runs.set(run.visitorId, current)
  }
  const visitors = new Map(input.visitors.map((visitor) => [visitor.id, visitor]))
  const leads = input.leads.map((lead) => toLead(lead, visitors.get(lead.visitor_id), sessions.get(lead.visitor_id) ?? 0, runs.get(lead.visitor_id)))
  const visitorCount = input.visitors.length
  const firstAnalysis = [...runs.values()].filter((run) => run.count >= 1).length
  const secondAnalysis = [...runs.values()].filter((run) => run.count >= 2).length
  const surveyStarted = input.visitors.filter((visitor) => ["started", "completed_verified", "already_completed_claimed"].includes(visitor.survey_status)).length
  const completedProfiles = input.visitors.filter((visitor) => visitor.survey_status === "completed_verified").length
  const contactRequests = leads.filter((lead) => lead.contactInterest === "Да, бих искал да обсъдим").length
  return {
    leads,
    kpis: {
      visits: visitorCount,
      registrations: leads.length,
      registrationConversion: visitorCount ? leads.length / visitorCount * 100 : 0,
      usersWithAnalysis: firstAnalysis,
      analyses: input.successfulRuns.length,
      returnVisitors: [...sessions.values()].filter((count) => count >= 2).length,
      completedProfiles,
      highPotential: leads.filter((lead) => lead.score >= 60).length,
      contactRequests,
    },
    funnel: [
      { label: "Посещения", value: visitorCount },
      { label: "Първи анализ", value: firstAnalysis },
      { label: "2+ анализа", value: secondAnalysis },
      { label: "Започнат въпросник", value: surveyStarted },
      { label: "Попълнен профил", value: completedProfiles },
      { label: "Оставен контакт", value: leads.length },
      { label: "Заявка за разговор", value: contactRequests },
    ],
    survey: buildSurveySummary(input.surveys),
  }
}

const USEFULNESS = ["1", "2", "3", "4", "5"]

export function buildSurveySummary(rows: SurveyRow[]): SurveySummary {
  const completed = latestCompleted(rows).flatMap((row) => {
    const answers = storedAnswers(row.answers)
    return answers ? [{ answers, at: row.completedAt ?? "" }] : []
  })
  const count = completed.length
  return {
    completed: count,
    groups: [
      group("Колко полезен ви се струва този анализ за реалната ви работа?", USEFULNESS, completed, (answers) => scoreLabel(answers.usefulness_score), true),
      group("Имате ли интерес към подобно решение за вашата организация?", BUSINESS_INTERESTS.map((item) => item.bg), completed, (answers) => interestLabel(answers), true, undefined, "Първите два отговора се появяват в таблицата отдолу. „Не засега“ остава само тук."),
      group("За какво бихте използвали подобен инструмент?", INTENDED_USE_CASES.map((item) => item.bg), completed, (answers) => answers.intended_use_cases, false, (answers) => answers.intended_use_other),
      group("Какво трябва да има, за да го използвате в реален проект?", REQUESTED_CAPABILITIES.map((item) => item.bg), completed, (answers) => answers.requested_capabilities, false, (answers) => answers.requested_capabilities_other),
      group("Коя част от предпроектната работа ви отнема най-много време?", TIME_SINKS.map((item) => item.bg), completed, (answers) => answers.time_sink, false, (answers) => answers.time_sink_other),
      group("Ако можехте да автоматизирате или улесните още една дейност във вашата работа, коя би била тя?", [], completed, () => null, false, (answers) => answers.automation_need),
      group("Вашата роля", ROLES.map((item) => item.bg), completed, (answers) => answers.role, false, (answers) => answers.role_other),
      group("Колко често организацията ви работи по подобни задачи?", WORK_FREQUENCIES.map((item) => item.bg), completed, (answers) => answers.organisation_work_frequency, false),
      group("В кои етапи от работата бихте използвали подобен инструмент?", WORKFLOW_STAGES.map((item) => item.bg), completed, (answers) => answers.workflow_stages, false, (answers) => answers.workflow_stages_other),
    ].filter((item): item is SurveyGroup => Boolean(item)),
  }
}

export async function getAdminData(): Promise<AdminSnapshot> {
  if (!supabaseServiceRoleConfigured()) {
    throw new StoreUnavailableError("Административният преглед изисква допълнителна сървърна конфигурация.")
  }
  const supabase = createSupabaseServiceClient()
  const [visitors, sessions, runs, leads, surveys] = await Promise.all([
    supabase.from("sa_beta_visitors").select("id, first_seen_at, last_seen_at, utm_source, utm_campaign, utm_content, survey_status").limit(5000),
    supabase.from("sa_beta_sessions").select("visitor_id").limit(5000),
    supabase.from("sa_beta_analysis_runs").select("visitor_id, settlement_name").eq("status", "success").limit(5000),
    supabase.from("sa_beta_leads").select("id, visitor_id, business_interest, name, organisation, email, phone, role, organisation_work_frequency, intended_use_cases, requested_capabilities, what_they_want_to_discuss, acquisition_source, utm_campaign, created_at").limit(5000),
    supabase.from("sa_beta_survey_responses").select("visitor_id, completed_at, answers").eq("status", "completed").limit(5000),
  ])
  const failed = [visitors.error, sessions.error, runs.error, leads.error, surveys.error].find(Boolean)
  if (failed) throw new StoreUnavailableError("Административният преглед изисква допълнителна сървърна конфигурация.")
  return buildAdminSnapshot({
    visitors: (visitors.data ?? []) as VisitorRow[],
    sessionVisitorIds: ((sessions.data ?? []) as Array<{ visitor_id: string }>).map((row) => row.visitor_id),
    successfulRuns: ((runs.data ?? []) as Array<{ visitor_id: string; settlement_name: string | null }>).map((row) => ({
      visitorId: row.visitor_id,
      settlementName: row.settlement_name,
    })),
    leads: (leads.data ?? []) as LeadRow[],
    surveys: ((surveys.data ?? []) as Array<{ visitor_id: string; completed_at: string | null; answers: unknown }>).map((row) => ({
      visitorId: row.visitor_id,
      completedAt: row.completed_at,
      answers: row.answers,
    })),
  })
}

function toLead(lead: LeadRow, visitor: VisitorRow | undefined, sessionCount: number, run: { count: number; settlements: string[] } | undefined): AdminLead {
  const contactInterest = lead.business_interest === "discuss"
    ? "Да, бих искал разговор"
    : lead.business_interest === "info"
      ? "Да, но на по-късен етап"
      : null
  const scoring = calculateLeadScore({
    organizationType: "Друго",
    employeeRange: null,
    projectTimeline: null,
    contactInterest,
    analysisCount: run?.count ?? 0,
    sessionCount,
    profileCompleted: visitor?.survey_status === "completed_verified",
    marketingConsent: false,
  })
  const displayedInterest = lead.business_interest === "discuss"
    ? "Да, бих искал да обсъдим"
    : lead.business_interest === "info"
      ? "Може би, изпратете ми повече информация"
      : "Не е посочен"
  return {
    id: lead.id,
    fullName: lead.name?.trim() || "Без име",
    email: lead.email?.trim() || "Не е посочен",
    phone: lead.phone,
    jobRole: lead.role,
    companyName: lead.organisation?.trim() || "Не е посочена",
    website: null,
    organizationType: lead.role?.trim() || "Не е посочена",
    employeeRange: lead.organisation_work_frequency,
    city: null,
    useCases: strings(lead.intended_use_cases),
    painPoints: strings(lead.requested_capabilities),
    projectTimeline: lead.what_they_want_to_discuss,
    contactInterest: displayedInterest,
    profileCompleted: visitor?.survey_status === "completed_verified",
    createdAt: lead.created_at,
    lastSeenAt: visitor?.last_seen_at ?? lead.created_at,
    source: lead.acquisition_source?.trim() || visitor?.utm_source?.trim() || "Директно",
    utmCampaign: lead.utm_campaign ?? visitor?.utm_campaign ?? null,
    utmContent: visitor?.utm_content ?? null,
    sessionCount,
    analysisCount: run?.count ?? 0,
    settlements: run?.settlements ?? [],
    score: scoring.score,
    status: scoring.status,
    scoreBreakdown: scoring.breakdown,
    marketingConsent: false,
  }
}

function latestCompleted(rows: SurveyRow[]) {
  const byVisitor = new Map<string, SurveyRow>()
  for (const row of rows) {
    const current = byVisitor.get(row.visitorId)
    if (!current || (row.completedAt ?? "") > (current.completedAt ?? "")) byVisitor.set(row.visitorId, row)
  }
  return [...byVisitor.values()]
}

function storedAnswers(value: unknown): StoredSurveyAnswers | null {
  if (!value || typeof value !== "object") return null
  const answers = value as StoredSurveyAnswers
  if (!Array.isArray(answers.intended_use_cases) && typeof answers.usefulness_score !== "number" && !answers.business_interest) return null
  return answers
}

function group(
  title: string,
  options: string[],
  completed: Array<{ answers: StoredSurveyAnswers; at: string }>,
  pick: (answers: StoredSurveyAnswers) => string | string[] | null,
  scale: boolean,
  readNote?: (answers: StoredSurveyAnswers) => string | null,
  hint?: string,
): SurveyGroup | null {
  const counts = new Map(options.map((label) => [label, 0]))
  for (const row of completed) {
    for (const label of new Set(list(pick(row.answers)))) counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const extras = [...counts.keys()].filter((label) => !options.includes(label) && (counts.get(label) ?? 0) > 0)
  const choices = (scale ? [...options, ...extras] : [...options, ...extras].filter((label) => (counts.get(label) ?? 0) > 0))
    .map((label) => ({ label, count: counts.get(label) ?? 0 }))
  if (!scale) choices.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "bg"))
  const notes = completed.flatMap((row) => {
    const text = readNote?.(row.answers)?.trim()
    return text ? [{ text, at: row.at }] : []
  }).sort((a, b) => b.at.localeCompare(a.at))
  if (!scale && choices.length === 0 && notes.length === 0) return null
  return { title, scale, hint, choices, notes }
}

function list(value: string | string[] | null) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  return values.map((item) => item.trim()).filter(Boolean)
}

function scoreLabel(score: number | null) {
  return score && USEFULNESS.includes(String(score)) ? String(score) : null
}

function interestLabel(answers: StoredSurveyAnswers) {
  if (answers.business_interest_label?.trim()) return answers.business_interest_label.trim()
  return BUSINESS_INTERESTS.find((item) => item.value === answers.business_interest)?.bg ?? null
}

function countBy(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}
