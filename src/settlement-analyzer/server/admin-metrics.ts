import type { Locale } from "@/lib/i18n";
import {
  BUSINESS_INTERESTS,
  INTENDED_USE_CASES,
  REQUESTED_CAPABILITIES,
  ROLES,
  TIME_SINKS,
  WORK_FREQUENCIES,
  WORKFLOW_STAGES,
  type BetaOption,
} from "@/settlement-analyzer/beta/options";
import { SOFIA_TIME_ZONE } from "@/settlement-analyzer/beta/config";
import type { StoredSurveyAnswers } from "@/settlement-analyzer/beta/types";
import { calculateLeadScore } from "@/settlement-analyzer/conference/lead-scoring";

export const UNATTRIBUTED_CAMPAIGN = "__unattributed__";

export type AdminPeriod = "7d" | "30d" | "all";

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
  interest: "discuss" | "info" | null
  profileCompleted: boolean
  createdAt: string
  lastSeenAt: string
  source: string
  utmCampaign: string | null
  utmContent: string | null
  sessionCount: number
  sessionCountAll: number
  analysisCount: number
  analysisCountAll: number
  settlements: string[]
  score: number
  status: string
  scoreBreakdown: Array<{ label: string; points: number }>
  marketingConsent: boolean
}

export type MetricValue = {
  value: number
  previous: number | null
}

export type Ratio = {
  numerator: number
  denominator: number
  percent: number | null
}

export type FunnelStep = {
  id: string
  count: number
  ratio: Ratio | null
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
  versions: number[]
  groups: SurveyGroup[]
}

export type SurveyRecord = {
  visitorId: string
  completedAt: string
  surveyVersion: number | null
  usefulness: number | null
  interest: string | null
  role: string | null
  useCases: string[]
  capabilities: string[]
  timeSink: string | null
  frequency: string | null
  stages: string[]
  automationNeed: string | null
  notes: string[]
}

export type RankedLabel = { label: string; count: number }

export type SeriesGrain = "day" | "week"

export type ActivityPoint = {
  key: string
  sessions: number
  analyses: number
}

export type AdminSnapshot = {
  generatedAt: string
  latestEventAt: string | null
  truncated: boolean
  period: AdminPeriod
  campaign: string
  campaigns: string[]
  hasUnattributed: boolean
  comparisonReady: boolean
  kpis: {
    sessions: MetricValue
    analyzedUsers: MetricValue
    analyses: MetricValue
    contacts: MetricValue
  }
  funnels: {
    engagement: FunnelStep[]
    survey: FunnelStep[]
    commercial: FunnelStep[]
  }
  feedback: {
    completed: number
    withAnswers: number
    averageUsefulness: number | null
    usefulnessCount: number
    topUseCase: RankedLabel | null
    topPain: RankedLabel | null
    topCapability: RankedLabel | null
    notNowWithoutAnswers: number
    single: {
      usefulness: number | null
      useCase: string | null
      pain: string | null
      capability: string | null
      interest: string | null
    } | null
  }
  business: {
    contacts: number
    identifiable: number
    anonymousInterest: number
    meetings: number
    informationRequests: number
    statuses: { high: number; medium: number; cold: number }
  }
  series: {
    grain: SeriesGrain
    points: ActivityPoint[]
  }
  survey: SurveySummary
  surveyRecords: SurveyRecord[]
  leads: AdminLead[]
  activity: {
    repeatVisitors: number
    repeatVisitorRate: Ratio
    repeatAnalyzers: number
    analysesPerUser: number | null
    surveyStarted: number
    surveyCompleted: number
    internalSuccesses: number
    settlements: RankedLabel[]
    layers: RankedLabel[]
    failedAttempts: number
    unfinishedAttempts: number
    failureShare: Ratio
  }
}

type VisitorRow = {
  id: string
  firstSeenAt: string
  lastSeenAt: string
  utmSource: string | null
  utmCampaign: string | null
  utmContent: string | null
  surveyStatus: string
  surveyStartedAt: string | null
  surveyCompletedAt: string | null
  surveyVersion: number | null
}

type SessionRow = {
  visitorId: string
  startedAt: string
}

type RunRow = {
  visitorId: string
  status: string
  settlementName: string | null
  startedAt: string | null
  completedAt: string | null
  countsTowardTrial: boolean | null
  layers: unknown
  errorCategory: string | null
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
  status: string
  startedAt: string | null
  completedAt: string | null
  surveyVersion: number | null
  answers: unknown
}

type EventRow = {
  visitorId: string
  eventName: string
  createdAt: string
  businessInterest: "discuss" | "info" | "not_now" | null
}

type Bounds = { start: number | null; end: number; endInclusive: boolean }

const STARTED_STATUSES = new Set(["started", "completed_verified", "already_completed_claimed"]);
const FAILURE_STATUSES = new Set(["failure", "cancelled", "expired"]);

export function periodBounds(period: AdminPeriod, now: Date): Bounds {
  const end = now.getTime();
  if (period === "all") return { start: null, end, endInclusive: true };
  const days = period === "7d" ? 7 : 30;
  const parts = sofiaDateParts(now);
  const shifted = addUtcDays(parts.year, parts.month, parts.day, -(days - 1));
  return { start: sofiaMidnightUtc(shifted.year, shifted.month, shifted.day), end, endInclusive: true };
}

export function buildAdminSnapshot(input: {
  visitors: VisitorRow[]
  sessions: SessionRow[]
  runs: RunRow[]
  leads: LeadRow[]
  surveys: SurveyRow[]
  events: EventRow[]
  period: AdminPeriod
  campaign: string
  now: Date
  generatedAt: string
  truncated: boolean
  locale: Locale
}): AdminSnapshot {
  const visitors = new Map(input.visitors.map((visitor) => [visitor.id, visitor]));
  const bounds = periodBounds(input.period, input.now);
  const previous = previousBounds(bounds);
  const earliest = earliestTimestamp(input);
  const current = measure(input, visitors, bounds);
  const comparisonReady = previous != null && previous.start != null && earliest != null && earliest <= previous.start && !input.truncated;
  const prior = comparisonReady && previous ? measure(input, visitors, previous) : null;
  const completedAnswers = current.completed.filter((row) => row.answers);
  const survey = buildSurveySummary(completedAnswers.map((row) => ({
    visitorId: row.visitorId,
    completedAt: row.completedAt,
    answers: row.answers,
  })), input.locale);
  survey.versions = uniqueNumbers(current.completed.map((row) => row.surveyVersion));
  const history = attachAllTimeCounts(input);
  const leads = current.leadRows.map((lead) => toLead(
    lead,
    visitors.get(lead.visitor_id),
    current.sessionsByVisitor.get(lead.visitor_id) ?? 0,
    current.runsByVisitor.get(lead.visitor_id),
    history.allTimeSessions.get(lead.visitor_id) ?? 0,
    history.allTimeRuns.get(lead.visitor_id),
  ));

  return {
    generatedAt: input.generatedAt,
    latestEventAt: earliest == null ? null : new Date(Math.max(...timestamps(input))).toISOString(),
    truncated: input.truncated,
    period: input.period,
    campaign: input.campaign,
    campaigns: campaignNames(input.visitors),
    hasUnattributed: hasUnattributed(input, visitors),
    comparisonReady,
    kpis: {
      sessions: metric(current.sessions, prior?.sessions),
      analyzedUsers: metric(current.analyzedUsers, prior?.analyzedUsers),
      analyses: metric(current.analyses, prior?.analyses),
      contacts: metric(current.contacts, prior?.contacts),
    },
    funnels: {
      engagement: [
        step("visitors", current.activeVisitors, null),
        step("analyzed", current.analyzedUsers, ratio(current.analyzedUsers, current.activeVisitors)),
        step("repeatAnalyses", current.repeatAnalyzers, ratio(current.repeatAnalyzers, current.analyzedUsers)),
      ],
      survey: [
        step("started", current.surveyStarted, null),
        step("completed", current.surveyCompleted, ratio(current.surveyCompleted, current.surveyStarted)),
      ],
      commercial: [
        step("contacts", current.contacts, null),
        step("meetings", current.meetings, ratio(current.meetings, current.contacts)),
      ],
    },
    feedback: feedbackOf(current.completed, completedAnswers, current.notNowWithoutAnswers, input.locale),
    business: {
      contacts: current.contacts,
      identifiable: current.identifiable,
      anonymousInterest: current.anonymousInterest,
      meetings: current.meetings,
      informationRequests: current.informationRequests,
      statuses: statusCounts(leads),
    },
    series: buildSeries(input.period, input.now, bounds, current.sessionTimes, current.successTimes),
    survey,
    surveyRecords: completedAnswers.map((row) => toRecord(row, input.locale)),
    leads,
    activity: {
      repeatVisitors: current.repeatVisitors,
      repeatVisitorRate: ratio(current.repeatVisitors, current.sessionVisitors),
      repeatAnalyzers: current.repeatAnalyzers,
      analysesPerUser: current.analyzedUsers > 0 ? Math.round((current.analyses / current.analyzedUsers) * 10) / 10 : null,
      surveyStarted: current.surveyStarted,
      surveyCompleted: current.surveyCompleted,
      internalSuccesses: current.internalSuccesses,
      settlements: topLabels(current.settlements, 8),
      layers: topLabels(current.layers, 8),
      failedAttempts: current.failedAttempts,
      unfinishedAttempts: current.unfinishedAttempts,
      failureShare: ratio(current.failedAttempts, current.finishedAttempts),
    },
  };
}

function measure(
  input: { visitors: VisitorRow[]; sessions: SessionRow[]; runs: RunRow[]; leads: LeadRow[]; surveys: SurveyRow[]; events: EventRow[]; campaign: string },
  visitors: Map<string, VisitorRow>,
  bounds: Bounds,
) {
  const allow = (visitorId: string) => visitorAllowed(visitorId, visitors, input.campaign);
  const sessions = input.sessions.filter((session) => allow(session.visitorId) && inRange(session.startedAt, bounds));
  const publicRuns = input.runs.filter((run) => allow(run.visitorId) && run.countsTowardTrial !== false && inRange(runTime(run), bounds));
  const successes = publicRuns.filter((run) => run.status === "success");
  const leads = input.leads.filter((lead) => allow(lead.visitor_id) && inRange(lead.created_at, bounds));
  const surveysByVisitor = groupSurveys(input.surveys.filter((row) => allow(row.visitorId)));
  const allTime = bounds.start == null;
  const started = new Set<string>();
  const completed: CompletedSurvey[] = [];

  for (const visitor of input.visitors) {
    if (!allow(visitor.id)) continue;
    const rows = surveysByVisitor.get(visitor.id) ?? [];
    if (startedInRange(visitor, rows, bounds, allTime)) started.add(visitor.id);
    const done = completedInRange(visitor, rows, bounds, allTime);
    if (done) {
      started.add(visitor.id);
      completed.push(done);
    }
  }

  const completedVisitors = new Set(completed.map((row) => row.visitorId));
  let notNowWithoutAnswers = 0;
  for (const event of input.events) {
    if (!allow(event.visitorId) || !inRange(event.createdAt, bounds)) continue;
    if (event.eventName === "beta_feedback_started" || event.eventName === "survey_completed") started.add(event.visitorId);
    if (event.eventName !== "survey_completed" || completedVisitors.has(event.visitorId)) continue;
    completedVisitors.add(event.visitorId);
    completed.push({
      visitorId: event.visitorId,
      completedAt: event.createdAt,
      surveyVersion: null,
      answers: null,
    });
    if (event.businessInterest === "not_now") notNowWithoutAnswers += 1;
  }

  const sessionsByVisitor = countBy(sessions.map((session) => session.visitorId));
  const runsByVisitor = new Map<string, { count: number; settlements: string[] }>();
  const settlements = new Map<string, number>();
  const layers = new Map<string, number>();
  for (const run of successes) {
    const current = runsByVisitor.get(run.visitorId) ?? { count: 0, settlements: [] };
    current.count += 1;
    const name = run.settlementName?.trim();
    if (name && !current.settlements.includes(name)) current.settlements.push(name);
    if (name) settlements.set(name, (settlements.get(name) ?? 0) + 1);
    for (const layer of layerIds(run.layers)) layers.set(layer, (layers.get(layer) ?? 0) + 1);
    runsByVisitor.set(run.visitorId, current);
  }

  const internalSuccesses = input.runs.filter((run) => allow(run.visitorId) && run.status === "success" && run.countsTowardTrial === false && inRange(runTime(run), bounds)).length;
  const active = new Set<string>(sessionsByVisitor.keys());
  for (const visitorId of runsByVisitor.keys()) active.add(visitorId);
  for (const run of publicRuns) active.add(run.visitorId);
  for (const visitorId of started) active.add(visitorId);
  for (const lead of leads) active.add(lead.visitor_id);

  const analyzedUsers = runsByVisitor.size;
  const repeatAnalyzers = [...runsByVisitor.values()].filter((run) => run.count >= 2).length;
  const sessionVisitors = sessionsByVisitor.size;
  const repeatVisitors = [...sessionsByVisitor.values()].filter((count) => count >= 2).length;
  const failedAttempts = publicRuns.filter((run) => FAILURE_STATUSES.has(run.status)).length;
  const unfinishedAttempts = publicRuns.filter((run) => run.status === "started").length;
  const meetings = leads.filter((lead) => lead.business_interest === "discuss").length;
  const informationRequests = leads.filter((lead) => lead.business_interest === "info").length;
  const identifiable = leads.filter((lead) => Boolean(lead.email?.trim())).length;
  const anonymousInterest = anonymousCount(completed, leads);

  return {
    sessions: sessions.length,
    activeVisitors: active.size,
    analyzedUsers,
    analyses: successes.length,
    repeatAnalyzers,
    repeatVisitors,
    sessionVisitors,
    surveyStarted: started.size,
    surveyCompleted: completed.length,
    notNowWithoutAnswers,
    internalSuccesses,
    sessionTimes: sessions.map((session) => session.startedAt),
    successTimes: successes.map((run) => runTime(run)),
    contacts: leads.length,
    meetings,
    informationRequests,
    identifiable,
    anonymousInterest,
    failedAttempts,
    unfinishedAttempts,
    finishedAttempts: successes.length + failedAttempts,
    settlements,
    layers,
    sessionsByVisitor,
    runsByVisitor,
    leadRows: leads,
    completed,
  };
}

function feedbackOf(completed: CompletedSurvey[], withAnswers: CompletedSurvey[], notNowWithoutAnswers: number, locale: Locale): AdminSnapshot["feedback"] {
  const scores = withAnswers.flatMap((row) => {
    const score = row.answers?.usefulness_score;
    return typeof score === "number" && score >= 1 && score <= 5 ? [score] : [];
  });
  const topUseCase = topPick(withAnswers, (answers) => answers.intended_use_cases, locale, INTENDED_USE_CASES);
  const topPain = topPick(withAnswers, (answers) => answers.time_sink ? [answers.time_sink] : [], locale, TIME_SINKS);
  const topCapability = topPick(withAnswers, (answers) => answers.requested_capabilities, locale, REQUESTED_CAPABILITIES);
  const singleSource = completed.length === 1 && withAnswers.length === 1 ? withAnswers[0] : null;
  return {
    completed: completed.length,
    withAnswers: withAnswers.length,
    averageUsefulness: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null,
    usefulnessCount: scores.length,
    topUseCase,
    topPain,
    topCapability,
    notNowWithoutAnswers,
    single: singleSource?.answers ? {
      usefulness: scoreOf(singleSource.answers),
      useCase: joinStored(singleSource.answers.intended_use_cases, locale, INTENDED_USE_CASES),
      pain: displayStored(locale, singleSource.answers.time_sink, TIME_SINKS),
      capability: joinStored(singleSource.answers.requested_capabilities, locale, REQUESTED_CAPABILITIES),
      interest: interestText(singleSource.answers, locale),
    } : null,
  };
}

function anonymousCount(completed: CompletedSurvey[], leads: LeadRow[]) {
  const leadsByVisitor = new Map(leads.map((lead) => [lead.visitor_id, lead]));
  let count = 0;
  for (const row of completed) {
    const interest = row.answers?.business_interest;
    if (interest !== "discuss" && interest !== "info") continue;
    const surveyEmail = row.answers?.contact?.email?.trim();
    const leadEmail = leadsByVisitor.get(row.visitorId)?.email?.trim();
    if (!surveyEmail && !leadEmail) count += 1;
  }
  return count;
}

type CompletedSurvey = {
  visitorId: string
  completedAt: string | null
  surveyVersion: number | null
  answers: StoredSurveyAnswers | null
}

function startedInRange(visitor: VisitorRow, rows: SurveyRow[], bounds: Bounds, allTime: boolean) {
  const times = [visitor.surveyStartedAt, ...rows.map((row) => row.startedAt)];
  if (times.some((value) => inRange(value, bounds))) return true;
  if (!allTime) return false;
  return STARTED_STATUSES.has(visitor.surveyStatus);
}

function completedInRange(visitor: VisitorRow, rows: SurveyRow[], bounds: Bounds, allTime: boolean): CompletedSurvey | null {
  const completed = rows.filter((row) => row.status === "completed");
  const dated = completed.filter((row) => inRange(row.completedAt, bounds));
  const chosen = latestSurvey(dated.length ? dated : allTime ? completed : []);
  if (chosen) {
    return {
      visitorId: visitor.id,
      completedAt: chosen.completedAt,
      surveyVersion: chosen.surveyVersion ?? visitor.surveyVersion,
      answers: storedAnswers(chosen.answers),
    };
  }
  if (visitor.surveyStatus === "completed_verified" && (allTime || inRange(visitor.surveyCompletedAt, bounds))) {
    return {
      visitorId: visitor.id,
      completedAt: visitor.surveyCompletedAt,
      surveyVersion: visitor.surveyVersion,
      answers: null,
    };
  }
  return null;
}

function toLead(
  lead: LeadRow,
  visitor: VisitorRow | undefined,
  sessionCount: number,
  run: { count: number; settlements: string[] } | undefined,
  sessionCountAll: number,
  runAll: { count: number; settlements: string[] } | undefined,
): AdminLead {
  const interest = lead.business_interest === "discuss" || lead.business_interest === "info" ? lead.business_interest : null;
  const contactInterest = interest === "discuss"
    ? "Да, бих искал разговор"
    : interest === "info"
      ? "Да, но на по-късен етап"
      : null;
  const scoring = calculateLeadScore({
    organizationType: "Друго",
    employeeRange: null,
    projectTimeline: null,
    contactInterest,
    analysisCount: runAll?.count ?? 0,
    sessionCount: sessionCountAll,
    profileCompleted: visitor?.surveyStatus === "completed_verified",
    marketingConsent: false,
  });
  const displayedInterest = interest === "discuss"
    ? "Да, бих искал да обсъдим"
    : interest === "info"
      ? "Може би, изпратете ми повече информация"
      : null;
  return {
    id: lead.id,
    fullName: lead.name?.trim() || "",
    email: lead.email?.trim() || "",
    phone: lead.phone,
    jobRole: lead.role?.trim() || null,
    companyName: lead.organisation?.trim() || "",
    website: null,
    organizationType: lead.role?.trim() || "",
    employeeRange: lead.organisation_work_frequency,
    city: null,
    useCases: strings(lead.intended_use_cases),
    painPoints: strings(lead.requested_capabilities),
    projectTimeline: lead.what_they_want_to_discuss,
    contactInterest: displayedInterest,
    interest,
    profileCompleted: visitor?.surveyStatus === "completed_verified",
    createdAt: lead.created_at,
    lastSeenAt: visitor?.lastSeenAt ?? lead.created_at,
    source: lead.acquisition_source?.trim() || visitor?.utmSource?.trim() || "",
    utmCampaign: lead.utm_campaign ?? visitor?.utmCampaign ?? null,
    utmContent: visitor?.utmContent ?? null,
    sessionCount,
    sessionCountAll,
    analysisCount: run?.count ?? 0,
    analysisCountAll: runAll?.count ?? 0,
    settlements: run?.settlements ?? [],
    score: scoring.score,
    status: scoring.status,
    scoreBreakdown: scoring.breakdown,
    marketingConsent: false,
  };
}

const USEFULNESS = ["1", "2", "3", "4", "5"];

export function buildSurveySummary(rows: Array<{ visitorId: string; completedAt: string | null; answers: unknown }>, locale: Locale = "bg"): SurveySummary {
  const completed = latestCompleted(rows).flatMap((row) => {
    const answers = storedAnswers(row.answers);
    return answers ? [{ answers, at: row.completedAt ?? "" }] : [];
  });
  const text = surveyTitles(locale);
  const options = (list: BetaOption[]) => list.map((item) => item.bg);
  return {
    completed: completed.length,
    versions: [],
    groups: [
      group(text.usefulness, USEFULNESS, completed, (answers) => scoreLabel(answers.usefulness_score), true, locale),
      group(text.interest, options(BUSINESS_INTERESTS), completed, (answers) => interestLabel(answers), true, locale, text.interestHint, BUSINESS_INTERESTS),
      group(text.use, options(INTENDED_USE_CASES), completed, (answers) => answers.intended_use_cases, false, locale, undefined, INTENDED_USE_CASES, (answers) => answers.intended_use_other),
      group(text.capability, options(REQUESTED_CAPABILITIES), completed, (answers) => answers.requested_capabilities, false, locale, undefined, REQUESTED_CAPABILITIES, (answers) => answers.requested_capabilities_other),
      group(text.time, options(TIME_SINKS), completed, (answers) => answers.time_sink, false, locale, undefined, TIME_SINKS, (answers) => answers.time_sink_other),
      group(text.automation, [], completed, () => null, false, locale, undefined, undefined, (answers) => answers.automation_need),
      group(text.role, options(ROLES), completed, (answers) => answers.role, false, locale, undefined, ROLES, (answers) => answers.role_other),
      group(text.frequency, options(WORK_FREQUENCIES), completed, (answers) => answers.organisation_work_frequency, false, locale, undefined, WORK_FREQUENCIES),
      group(text.stages, options(WORKFLOW_STAGES), completed, (answers) => answers.workflow_stages, false, locale, undefined, WORKFLOW_STAGES, (answers) => answers.workflow_stages_other),
    ].filter((item): item is SurveyGroup => Boolean(item)),
  };
}

function toRecord(row: CompletedSurvey, locale: Locale): SurveyRecord {
  const answers = row.answers;
  const notes = answers ? [answers.intended_use_other, answers.requested_capabilities_other, answers.time_sink_other, answers.workflow_stages_other, answers.role_other, answers.automation_need].flatMap((value) => {
    const text = value?.trim();
    return text ? [text] : [];
  }) : [];
  return {
    visitorId: row.visitorId,
    completedAt: row.completedAt ?? "",
    surveyVersion: row.surveyVersion,
    usefulness: answers ? scoreOf(answers) : null,
    interest: answers ? interestText(answers, locale) : null,
    role: answers ? displayStored(locale, answers.role, ROLES) : null,
    useCases: answers ? presentLabels(answers.intended_use_cases, locale, INTENDED_USE_CASES) : [],
    capabilities: answers ? presentLabels(answers.requested_capabilities, locale, REQUESTED_CAPABILITIES) : [],
    timeSink: answers ? displayStored(locale, answers.time_sink, TIME_SINKS) : null,
    frequency: answers ? displayStored(locale, answers.organisation_work_frequency, WORK_FREQUENCIES) : null,
    stages: answers ? presentLabels(answers.workflow_stages, locale, WORKFLOW_STAGES) : [],
    automationNeed: answers?.automation_need?.trim() || null,
    notes,
  };
}

function group(
  title: string,
  options: string[],
  completed: Array<{ answers: StoredSurveyAnswers; at: string }>,
  pick: (answers: StoredSurveyAnswers) => string | string[] | null,
  scale: boolean,
  locale: Locale,
  hint?: string,
  catalog?: BetaOption[],
  readNote?: (answers: StoredSurveyAnswers) => string | null,
): SurveyGroup | null {
  const counts = new Map(options.map((label) => [label, 0]));
  for (const row of completed) {
    for (const label of new Set(list(pick(row.answers)))) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const extras = [...counts.keys()].filter((label) => !options.includes(label) && (counts.get(label) ?? 0) > 0);
  const choices = (scale ? [...options, ...extras] : [...options, ...extras].filter((label) => (counts.get(label) ?? 0) > 0))
    .map((label) => ({ label: catalog ? displayStored(locale, label, catalog) ?? label : label, count: counts.get(label) ?? 0 }));
  if (!scale) choices.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale === "bg" ? "bg" : "en"));
  const notes = completed.flatMap((row) => {
    const text = readNote?.(row.answers)?.trim();
    return text ? [{ text, at: row.at }] : [];
  }).sort((a, b) => b.at.localeCompare(a.at));
  if (!scale && choices.length === 0 && notes.length === 0) return null;
  return { title, scale, hint, choices, notes };
}

function visitorAllowed(visitorId: string, visitors: Map<string, VisitorRow>, campaign: string) {
  if (!campaign) return true;
  return campaignKey(visitors.get(visitorId)?.utmCampaign) === campaign;
}

function campaignKey(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNATTRIBUTED_CAMPAIGN;
}

function campaignNames(visitors: VisitorRow[]) {
  return [...new Set(visitors.flatMap((visitor) => {
    const name = visitor.utmCampaign?.trim();
    return name ? [name] : [];
  }))].sort((a, b) => a.localeCompare(b, "bg"));
}

function hasUnattributed(input: { visitors: VisitorRow[]; sessions: SessionRow[] }, visitors: Map<string, VisitorRow>) {
  if (input.visitors.some((visitor) => !visitor.utmCampaign?.trim())) return true;
  return input.sessions.some((session) => !visitors.has(session.visitorId));
}

function inRange(value: string | null | undefined, bounds: Bounds) {
  if (!value) return false;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  if (bounds.endInclusive ? time > bounds.end : time >= bounds.end) return false;
  if (bounds.start != null && time < bounds.start) return false;
  return true;
}

function previousBounds(bounds: Bounds): Bounds | null {
  if (bounds.start == null) return null;
  const length = bounds.end - bounds.start;
  if (length <= 0) return null;
  return { start: bounds.start - length, end: bounds.start, endInclusive: false };
}

function runTime(run: RunRow) {
  return run.completedAt ?? run.startedAt;
}

function isSuccessRun(run: RunRow) {
  return run.status === "success" && run.countsTowardTrial !== false;
}

function earliestTimestamp(input: { visitors: VisitorRow[]; sessions: SessionRow[]; runs: RunRow[]; leads: LeadRow[]; surveys: SurveyRow[]; events: EventRow[] }) {
  const values = timestamps(input);
  return values.length ? Math.min(...values) : null;
}

function timestamps(input: { visitors: VisitorRow[]; sessions: SessionRow[]; runs: RunRow[]; leads: LeadRow[]; surveys: SurveyRow[]; events: EventRow[] }) {
  const raw = [
    ...input.visitors.flatMap((visitor) => [visitor.firstSeenAt, visitor.lastSeenAt, visitor.surveyStartedAt, visitor.surveyCompletedAt]),
    ...input.sessions.map((session) => session.startedAt),
    ...input.runs.map((run) => runTime(run)),
    ...input.leads.map((lead) => lead.created_at),
    ...input.surveys.flatMap((row) => [row.startedAt, row.completedAt]),
    ...input.events.map((event) => event.createdAt),
  ];
  return raw.flatMap((value) => {
    const time = value ? Date.parse(value) : Number.NaN;
    return Number.isNaN(time) ? [] : [time];
  });
}

function metric(value: number, previous: number | null | undefined): MetricValue {
  return { value, previous: previous ?? null };
}

function step(id: string, count: number, ratioValue: Ratio | null): FunnelStep {
  return { id, count, ratio: ratioValue };
}

function ratio(numerator: number, denominator: number): Ratio {
  if (denominator <= 0) return { numerator, denominator, percent: null };
  return { numerator, denominator, percent: (numerator / denominator) * 100 };
}

function layerIds(value: unknown) {
  if (Array.isArray(value)) return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, enabled]) => enabled === true && key.trim() ? [key] : []);
}

function topLabels(counts: Map<string, number>, limit: number): RankedLabel[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "bg"))
    .slice(0, limit);
}

function topPick(
  rows: CompletedSurvey[],
  pick: (answers: StoredSurveyAnswers) => string[] | null | undefined,
  locale: Locale,
  catalog: BetaOption[],
): RankedLabel | null {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.answers) continue;
    for (const label of new Set(list(pick(row.answers) ?? null))) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ranked = topLabels(counts, 1)[0];
  if (!ranked) return null;
  return { label: displayStored(locale, ranked.label, catalog) ?? ranked.label, count: ranked.count };
}

function presentLabels(values: string[], locale: Locale, catalog: BetaOption[]) {
  return values.flatMap((value) => {
    const label = displayStored(locale, value, catalog);
    return label ? [label] : [];
  });
}

function displayStored(locale: Locale, value: string | null | undefined, catalog: BetaOption[]) {
  const label = value?.trim();
  if (!label) return null;
  if (locale === "bg") return label;
  return catalog.find((option) => option.bg === label)?.en ?? label;
}

function interestText(answers: StoredSurveyAnswers, locale: Locale) {
  const match = BUSINESS_INTERESTS.find((item) => item.value === answers.business_interest);
  if (match) return match[locale];
  return answers.business_interest_label?.trim() || null;
}

function interestLabel(answers: StoredSurveyAnswers) {
  if (answers.business_interest_label?.trim()) return answers.business_interest_label.trim();
  return BUSINESS_INTERESTS.find((item) => item.value === answers.business_interest)?.bg ?? null;
}

function scoreOf(answers: StoredSurveyAnswers) {
  return typeof answers.usefulness_score === "number" && answers.usefulness_score >= 1 && answers.usefulness_score <= 5
    ? answers.usefulness_score
    : null;
}

function scoreLabel(score: number | null) {
  return score && USEFULNESS.includes(String(score)) ? String(score) : null;
}

function storedAnswers(value: unknown): StoredSurveyAnswers | null {
  if (!value || typeof value !== "object") return null;
  const answers = value as StoredSurveyAnswers;
  if (!Array.isArray(answers.intended_use_cases) && typeof answers.usefulness_score !== "number" && !answers.business_interest) return null;
  return answers;
}

function latestCompleted(rows: Array<{ visitorId: string; completedAt: string | null; answers: unknown }>) {
  const byVisitor = new Map<string, { visitorId: string; completedAt: string | null; answers: unknown }>();
  for (const row of rows) {
    const current = byVisitor.get(row.visitorId);
    if (!current || (row.completedAt ?? "") > (current.completedAt ?? "")) byVisitor.set(row.visitorId, row);
  }
  return [...byVisitor.values()];
}

function latestSurvey(rows: SurveyRow[]) {
  return rows.reduce<SurveyRow | null>((latest, row) => {
    if (!latest || (row.completedAt ?? "") > (latest.completedAt ?? "")) return row;
    return latest;
  }, null);
}

function groupSurveys(rows: SurveyRow[]) {
  const grouped = new Map<string, SurveyRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.visitorId) ?? [];
    current.push(row);
    grouped.set(row.visitorId, current);
  }
  return grouped;
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function list(value: string | string[] | null) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((item) => item.trim()).filter(Boolean);
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function uniqueNumbers(values: Array<number | null>) {
  return [...new Set(values.filter((value): value is number => typeof value === "number"))].sort((a, b) => a - b);
}

function surveyTitles(locale: Locale) {
  if (locale === "en") {
    return {
      usefulness: "How useful does this analysis seem for your actual work?",
      interest: "Are you interested in a solution like this for your organisation?",
      interestHint: "“Not for now” does not create a contact and stays in the survey.",
      use: "What would you use a tool like this for?",
      capability: "What would it need for you to use it on a real project?",
      time: "Which part of the pre-design work takes you the most time?",
      automation: "If you could automate or simplify one more part of your work, what would it be?",
      role: "Your role",
      frequency: "How often does your organisation do this kind of work?",
      stages: "At which stages of the work would you use a tool like this?",
    };
  }
  return {
    usefulness: "Колко полезен ви се струва този анализ за реалната ви работа?",
    interest: "Имате ли интерес към подобно решение за вашата организация?",
    interestHint: "„Не засега“ не създава контакт и остава само в анкетата.",
    use: "За какво бихте използвали подобен инструмент?",
    capability: "Какво трябва да има, за да го използвате в реален проект?",
    time: "Коя част от предпроектната работа ви отнема най-много време?",
    automation: "Ако можехте да автоматизирате или улесните още една дейност във вашата работа, коя би била тя?",
    role: "Вашата роля",
    frequency: "Колко често организацията ви работи по подобни задачи?",
    stages: "В кои етапи от работата бихте използвали подобен инструмент?",
  };
}

const DAILY_SERIES_LIMIT = 62;

function buildSeries(period: AdminPeriod, now: Date, bounds: Bounds, sessionTimes: Array<string | null>, successTimes: Array<string | null>) {
  const sessions = countDayKeys(sessionTimes);
  const analyses = countDayKeys(successTimes);
  const observed = [...sessions.keys(), ...analyses.keys()];
  let keys: string[];
  if (bounds.start != null) keys = enumerateDays(bounds.start, bounds.end);
  else if (observed.length === 0) return { grain: "day" as const, points: [] };
  else {
    const endKey = dayKeyFromParts(sofiaDateParts(now));
    const startKey = observed.reduce((min, key) => key < min ? key : min, observed[0] ?? endKey);
    keys = enumerateDayKeys(startKey, endKey);
  }
  if (period === "all" && keys.length > DAILY_SERIES_LIMIT) {
    return { grain: "week" as const, points: weekPoints(keys, sessions, analyses) };
  }
  return {
    grain: "day" as const,
    points: keys.map((key) => ({ key, sessions: sessions.get(key) ?? 0, analyses: analyses.get(key) ?? 0 })),
  };
}

function countDayKeys(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = sofiaKeyFromIso(value);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function enumerateDays(startMs: number, endMs: number) {
  return enumerateDayKeys(dayKeyFromParts(sofiaDateParts(new Date(startMs))), dayKeyFromParts(sofiaDateParts(new Date(endMs))));
}

function enumerateDayKeys(startKey: string, endKey: string) {
  const keys: string[] = [];
  let cursor = parseDayKey(startKey);
  for (let guard = 0; guard < 800; guard += 1) {
    const key = dayKeyFromParts(cursor);
    keys.push(key);
    if (key >= endKey) break;
    cursor = addUtcDays(cursor.year, cursor.month, cursor.day, 1);
  }
  return keys;
}

function weekPoints(keys: string[], sessions: Map<string, number>, analyses: Map<string, number>) {
  const order: string[] = [];
  const buckets = new Map<string, { sessions: number; analyses: number }>();
  for (const key of keys) {
    const week = mondayKey(key);
    const bucket = buckets.get(week) ?? { sessions: 0, analyses: 0 };
    if (!buckets.has(week)) order.push(week);
    bucket.sessions += sessions.get(key) ?? 0;
    bucket.analyses += analyses.get(key) ?? 0;
    buckets.set(week, bucket);
  }
  return order.map((key) => ({ key, sessions: buckets.get(key)?.sessions ?? 0, analyses: buckets.get(key)?.analyses ?? 0 }));
}

function mondayKey(key: string) {
  const cursor = parseDayKey(key);
  const weekday = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day)).getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return dayKeyFromParts(addUtcDays(cursor.year, cursor.month, cursor.day, delta));
}

function sofiaKeyFromIso(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return dayKeyFromParts(sofiaDateParts(new Date(time)));
}

function dayKeyFromParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseDayKey(key: string) {
  const [year = 0, month = 0, day = 0] = key.split("-").map(Number);
  return { year, month, day };
}

function sofiaDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: SOFIA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

function addUtcDays(year: number, month: number, day: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function sofiaMidnightUtc(year: number, month: number, day: number) {
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetMinutes = sofiaOffsetMinutes(probe);
  return utcMidnight - offsetMinutes * 60_000;
}

function sofiaOffsetMinutes(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SOFIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const zoned = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
  return Math.round((zoned - instant.getTime()) / 60_000);
}

function statusCounts(leads: AdminLead[]): AdminSnapshot["business"]["statuses"] {
  const statuses = { high: 0, medium: 0, cold: 0 };
  for (const lead of leads) {
    if (lead.status === "Висок потенциал") statuses.high += 1;
    else if (lead.status === "Потенциален") statuses.medium += 1;
    else statuses.cold += 1;
  }
  return statuses;
}

function joinStored(values: string[] | null | undefined, locale: Locale, catalog: BetaOption[]) {
  const labels = (values ?? []).flatMap((value) => {
    const label = displayStored(locale, value, catalog);
    return label ? [label] : [];
  });
  return labels.length ? labels.join(", ") : null;
}

function attachAllTimeCounts(input: {
  visitors: VisitorRow[]
  sessions: SessionRow[]
  runs: RunRow[]
  campaign: string
}) {
  const visitors = new Map(input.visitors.map((visitor) => [visitor.id, visitor]));
  const allow = (visitorId: string) => visitorAllowed(visitorId, visitors, input.campaign);
  const allTimeSessions = countBy(input.sessions.filter((session) => allow(session.visitorId)).map((session) => session.visitorId));
  const allTimeRuns = new Map<string, { count: number; settlements: string[] }>();
  for (const run of input.runs) {
    if (!allow(run.visitorId) || !isSuccessRun(run)) continue;
    const current = allTimeRuns.get(run.visitorId) ?? { count: 0, settlements: [] };
    current.count += 1;
    const name = run.settlementName?.trim();
    if (name && !current.settlements.includes(name)) current.settlements.push(name);
    allTimeRuns.set(run.visitorId, current);
  }
  return { allTimeSessions, allTimeRuns };
}
