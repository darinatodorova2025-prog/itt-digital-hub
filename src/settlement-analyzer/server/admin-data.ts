import "server-only";

import { createSupabaseServiceClient, supabaseServiceRoleConfigured } from "@/lib/cms/supabase-service";
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

export function buildAdminSnapshot(input: {
  visitors: VisitorRow[]
  sessionVisitorIds: string[]
  successfulRuns: Array<{ visitorId: string; settlementName: string | null }>
  leads: LeadRow[]
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
  }
}

export async function getAdminData(): Promise<AdminSnapshot> {
  if (!supabaseServiceRoleConfigured()) {
    throw new StoreUnavailableError("Административният преглед изисква допълнителна сървърна конфигурация.")
  }
  const supabase = createSupabaseServiceClient()
  const [visitors, sessions, runs, leads] = await Promise.all([
    supabase.from("sa_beta_visitors").select("id, first_seen_at, last_seen_at, utm_source, utm_campaign, utm_content, survey_status").limit(5000),
    supabase.from("sa_beta_sessions").select("visitor_id").limit(5000),
    supabase.from("sa_beta_analysis_runs").select("visitor_id, settlement_name").eq("status", "success").limit(5000),
    supabase.from("sa_beta_leads").select("id, visitor_id, business_interest, name, organisation, email, phone, role, organisation_work_frequency, intended_use_cases, requested_capabilities, what_they_want_to_discuss, acquisition_source, utm_campaign, created_at").limit(5000),
  ])
  const failed = [visitors.error, sessions.error, runs.error, leads.error].find(Boolean)
  if (failed) throw new StoreUnavailableError("Административният преглед изисква допълнителна сървърна конфигурация.")
  return buildAdminSnapshot({
    visitors: (visitors.data ?? []) as VisitorRow[],
    sessionVisitorIds: ((sessions.data ?? []) as Array<{ visitor_id: string }>).map((row) => row.visitor_id),
    successfulRuns: ((runs.data ?? []) as Array<{ visitor_id: string; settlement_name: string | null }>).map((row) => ({
      visitorId: row.visitor_id,
      settlementName: row.settlement_name,
    })),
    leads: (leads.data ?? []) as LeadRow[],
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

function countBy(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}
