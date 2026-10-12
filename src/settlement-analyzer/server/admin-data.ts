import "server-only";

import type { Locale } from "@/lib/i18n";
import { createSupabaseServiceClient, supabaseServiceRoleConfigured } from "@/lib/cms/supabase-service";
import {
  buildAdminSnapshot,
  type AdminPeriod,
  type AdminSnapshot,
} from "./admin-metrics";
import { StoreUnavailableError } from "./store";

export type { AdminLead, AdminPeriod, AdminSnapshot, SurveyGroup, SurveyRecord, SurveySummary } from "./admin-metrics";
export { UNATTRIBUTED_CAMPAIGN, buildAdminSnapshot, buildSurveySummary } from "./admin-metrics";

const ROW_LIMIT = 5000;

export async function getAdminData(input: { period: AdminPeriod; campaign: string; locale: Locale }): Promise<AdminSnapshot> {
  if (!supabaseServiceRoleConfigured()) {
    throw new StoreUnavailableError("Административният преглед изисква допълнителна сървърна конфигурация.");
  }
  const supabase = createSupabaseServiceClient();
  const [visitors, sessions, runs, leads, surveys] = await Promise.all([
    supabase.from("sa_beta_visitors").select("id, first_seen_at, last_seen_at, utm_source, utm_campaign, utm_content, survey_status, survey_started_at, survey_completed_at, survey_version").order("last_seen_at", { ascending: false }).limit(ROW_LIMIT),
    supabase.from("sa_beta_sessions").select("visitor_id, started_at").order("started_at", { ascending: false }).limit(ROW_LIMIT),
    supabase.from("sa_beta_analysis_runs").select("visitor_id, status, settlement_name, started_at, completed_at, counts_toward_trial, layers, error_category").order("created_at", { ascending: false }).limit(ROW_LIMIT),
    supabase.from("sa_beta_leads").select("id, visitor_id, business_interest, name, organisation, email, phone, role, organisation_work_frequency, intended_use_cases, requested_capabilities, what_they_want_to_discuss, acquisition_source, utm_campaign, created_at").order("created_at", { ascending: false }).limit(ROW_LIMIT),
    supabase.from("sa_beta_survey_responses").select("visitor_id, status, started_at, completed_at, survey_version, answers").order("completed_at", { ascending: false }).limit(ROW_LIMIT),
  ]);
  const failed = [visitors.error, sessions.error, runs.error, leads.error, surveys.error].find(Boolean);
  if (failed) throw new StoreUnavailableError("Административният преглед изисква допълнителна сървърна конфигурация.");
  const now = new Date();
  return buildAdminSnapshot({
    visitors: ((visitors.data ?? []) as VisitorDb[]).map((row) => ({
      id: row.id,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      utmSource: row.utm_source,
      utmCampaign: row.utm_campaign,
      utmContent: row.utm_content,
      surveyStatus: row.survey_status,
      surveyStartedAt: row.survey_started_at,
      surveyCompletedAt: row.survey_completed_at,
      surveyVersion: row.survey_version,
    })),
    sessions: ((sessions.data ?? []) as SessionDb[]).map((row) => ({ visitorId: row.visitor_id, startedAt: row.started_at })),
    runs: ((runs.data ?? []) as RunDb[]).map((row) => ({
      visitorId: row.visitor_id,
      status: row.status,
      settlementName: row.settlement_name,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      countsTowardTrial: row.counts_toward_trial,
      layers: row.layers,
      errorCategory: row.error_category,
    })),
    leads: (leads.data ?? []) as LeadDb[],
    surveys: ((surveys.data ?? []) as SurveyDb[]).map((row) => ({
      visitorId: row.visitor_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      surveyVersion: row.survey_version,
      answers: row.answers,
    })),
    period: input.period,
    campaign: input.campaign,
    now,
    generatedAt: now.toISOString(),
    truncated: [visitors.data, sessions.data, runs.data, leads.data, surveys.data].some((rows) => (rows?.length ?? 0) >= ROW_LIMIT),
    locale: input.locale,
  });
}

type VisitorDb = {
  id: string
  first_seen_at: string
  last_seen_at: string
  utm_source: string | null
  utm_campaign: string | null
  utm_content: string | null
  survey_status: string
  survey_started_at: string | null
  survey_completed_at: string | null
  survey_version: number | null
}

type SessionDb = { visitor_id: string; started_at: string }

type RunDb = {
  visitor_id: string
  status: string
  settlement_name: string | null
  started_at: string | null
  completed_at: string | null
  counts_toward_trial: boolean | null
  layers: unknown
  error_category: string | null
}

type LeadDb = {
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

type SurveyDb = {
  visitor_id: string
  status: string
  started_at: string | null
  completed_at: string | null
  survey_version: number | null
  answers: unknown
}
