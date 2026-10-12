import { describe, expect, it } from "vitest";
import { buildAdminSnapshot, buildSurveySummary, periodBounds, UNATTRIBUTED_CAMPAIGN } from "./admin-metrics";

const now = new Date("2026-10-12T12:00:00.000Z");

function visitor(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    firstSeenAt: "2026-10-10T08:00:00.000Z",
    lastSeenAt: "2026-10-10T09:00:00.000Z",
    utmSource: null,
    utmCampaign: null,
    utmContent: null,
    surveyStatus: "never_seen",
    surveyStartedAt: null,
    surveyCompletedAt: null,
    surveyVersion: 1,
    ...overrides,
  };
}

function snapshot(overrides: Partial<Parameters<typeof buildAdminSnapshot>[0]> = {}) {
  return buildAdminSnapshot({
    visitors: [],
    sessions: [],
    runs: [],
    leads: [],
    surveys: [],
    period: "all",
    campaign: "",
    now,
    generatedAt: now.toISOString(),
    truncated: false,
    locale: "bg",
    ...overrides,
  });
}

describe("buildAdminSnapshot", () => {
  it("counts sessions, successful analyses and meeting requests separately", () => {
    const result = snapshot({
      visitors: [
        visitor("v1", { utmSource: "qr", utmCampaign: "summit", surveyStatus: "completed_verified", surveyStartedAt: "2026-10-10T08:10:00.000Z", surveyCompletedAt: "2026-10-10T08:20:00.000Z" }),
        visitor("v2"),
      ],
      sessions: [
        { visitorId: "v1", startedAt: "2026-10-10T08:00:00.000Z" },
        { visitorId: "v1", startedAt: "2026-10-11T08:00:00.000Z" },
        { visitorId: "v2", startedAt: "2026-10-10T08:00:00.000Z" },
      ],
      runs: [
        { visitorId: "v1", status: "success", settlementName: "Банско", startedAt: "2026-10-10T08:05:00.000Z", completedAt: "2026-10-10T08:06:00.000Z", countsTowardTrial: true, layers: ["roads", "buildings"], errorCategory: null },
        { visitorId: "v1", status: "success", settlementName: "Банско", startedAt: "2026-10-10T08:07:00.000Z", completedAt: "2026-10-10T08:08:00.000Z", countsTowardTrial: true, layers: ["roads"], errorCategory: null },
        { visitorId: "v2", status: "success", settlementName: "Разлог", startedAt: "2026-10-10T08:10:00.000Z", completedAt: "2026-10-10T08:11:00.000Z", countsTowardTrial: true, layers: ["terrain"], errorCategory: null },
        { visitorId: "v2", status: "failure", settlementName: "Разлог", startedAt: "2026-10-10T08:12:00.000Z", completedAt: "2026-10-10T08:13:00.000Z", countsTowardTrial: true, layers: [], errorCategory: "upstream" },
        { visitorId: "v1", status: "success", settlementName: "Вътрешен", startedAt: "2026-10-10T08:14:00.000Z", completedAt: "2026-10-10T08:15:00.000Z", countsTowardTrial: false, layers: ["roads"], errorCategory: null },
      ],
      leads: [{
        id: "lead-1",
        visitor_id: "v1",
        business_interest: "discuss",
        name: "Иван",
        organisation: "Пример ООД",
        email: "ivan@example.com",
        phone: null,
        role: "Проектант",
        organisation_work_frequency: "Всеки месец",
        intended_use_cases: ["Подготовка преди ВиК проект"],
        requested_capabilities: ["Кадастър и имоти"],
        what_they_want_to_discuss: "Пилот",
        acquisition_source: null,
        utm_campaign: "summit",
        created_at: "2026-10-10T08:30:00.000Z",
      }],
    });

    expect(result.kpis.sessions.value).toBe(3);
    expect(result.kpis.analyzedUsers.value).toBe(2);
    expect(result.kpis.analyses.value).toBe(3);
    expect(result.kpis.contacts.value).toBe(1);
    expect(result.activity.failedAttempts).toBe(1);
    expect(result.activity.repeatVisitors).toBe(1);
    expect(result.activity.repeatVisitorRate).toEqual({ numerator: 1, denominator: 2, percent: 50 });
    expect(result.activity.analysesPerUser).toBe(1.5);
    expect(result.activity.settlements.map((item) => item.label)).toEqual(["Банско", "Разлог"]);
    expect(result.funnels.engagement.map((step) => step.count)).toEqual([2, 2, 1]);
    expect(result.funnels.engagement[1]?.ratio?.percent).toBe(100);
    expect(result.funnels.engagement[2]?.ratio).toEqual({ numerator: 1, denominator: 2, percent: 50 });
    expect(result.funnels.survey.map((step) => [step.id, step.count])).toEqual([["started", 1], ["completed", 1]]);
    expect(result.funnels.commercial[1]?.ratio?.percent).toBe(100);
    expect(result.leads[0]).toMatchObject({
      fullName: "Иван",
      companyName: "Пример ООД",
      analysisCount: 2,
      settlements: ["Банско"],
      contactInterest: "Да, бих искал да обсъдим",
      interest: "discuss",
      sessionCount: 2,
    });
    expect(result.leads[0]?.score).toBeGreaterThan(0);
    expect(result.business.identifiable).toBe(1);
    expect(result.business.meetings).toBe(1);
    expect(result.business.anonymousInterest).toBe(0);
  });

  it("does not turn an empty population into a 100 percent conversion", () => {
    const result = snapshot();
    expect(result.funnels.engagement[1]?.ratio?.percent).toBeNull();
    expect(result.funnels.survey[1]?.ratio?.percent).toBeNull();
    expect(result.funnels.commercial[1]?.ratio?.percent).toBeNull();
    expect(result.activity.repeatVisitorRate.percent).toBeNull();
    expect(result.activity.analysesPerUser).toBeNull();
    expect(result.kpis.sessions.previous).toBeNull();
  });

  it("keeps unattributed visitors out of a named campaign", () => {
    const shared = {
      visitors: [
        visitor("attributed", { utmCampaign: "summit" }),
        visitor("plain"),
      ],
      sessions: [
        { visitorId: "attributed", startedAt: "2026-10-10T08:00:00.000Z" },
        { visitorId: "plain", startedAt: "2026-10-10T08:00:00.000Z" },
      ],
      runs: [
        { visitorId: "plain", status: "success", settlementName: "Банско", startedAt: "2026-10-10T08:00:00.000Z", completedAt: "2026-10-10T08:01:00.000Z", countsTowardTrial: true, layers: [], errorCategory: null },
      ],
    };
    const named = snapshot({ ...shared, campaign: "summit" });
    const unattributed = snapshot({ ...shared, campaign: UNATTRIBUTED_CAMPAIGN });
    expect(named.kpis.sessions.value).toBe(1);
    expect(named.kpis.analyses.value).toBe(0);
    expect(unattributed.kpis.sessions.value).toBe(1);
    expect(unattributed.kpis.analyses.value).toBe(1);
    expect(named.campaigns).toEqual(["summit"]);
    expect(named.hasUnattributed).toBe(true);
  });

  it("filters each metric by the event date and compares an equal previous window", () => {
    const result = snapshot({
      period: "7d",
      visitors: [visitor("v1", { firstSeenAt: "2026-08-01T08:00:00.000Z" })],
      sessions: [
        { visitorId: "v1", startedAt: "2026-10-11T08:00:00.000Z" },
        { visitorId: "v1", startedAt: "2026-09-01T08:00:00.000Z" },
      ],
      runs: [
        { visitorId: "v1", status: "success", settlementName: "Банско", startedAt: "2026-10-11T08:00:00.000Z", completedAt: "2026-10-11T08:05:00.000Z", countsTowardTrial: true, layers: [], errorCategory: null },
        { visitorId: "v1", status: "success", settlementName: "Разлог", startedAt: "2026-09-20T08:00:00.000Z", completedAt: "2026-09-20T08:05:00.000Z", countsTowardTrial: true, layers: [], errorCategory: null },
      ],
    });
    expect(result.kpis.sessions.value).toBe(1);
    expect(result.kpis.analyses.value).toBe(1);
    expect(result.comparisonReady).toBe(true);
    expect(result.kpis.sessions.previous).toBe(0);
    expect(result.kpis.analyses.previous).toBe(0);
    expect(result.leads).toEqual([]);
  });

  it("withholds a period comparison when history does not cover the previous window", () => {
    const result = snapshot({
      period: "30d",
      visitors: [visitor("v1", { firstSeenAt: "2026-10-11T08:00:00.000Z" })],
      sessions: [{ visitorId: "v1", startedAt: "2026-10-11T08:00:00.000Z" }],
    });
    expect(result.comparisonReady).toBe(false);
    expect(result.kpis.sessions.previous).toBeNull();
    expect(result.kpis.sessions.value).toBe(1);
  });

  it("uses Europe/Sofia calendar days for the rolling windows", () => {
    const seven = periodBounds("7d", now);
    const thirty = periodBounds("30d", now);
    expect(new Date(seven.start ?? 0).toISOString()).toBe("2026-10-05T21:00:00.000Z");
    expect(new Date(thirty.start ?? 0).toISOString()).toBe("2026-09-12T21:00:00.000Z");
  });

  it("counts completed survey answers and keeps free text without contact details", () => {
    const summary = buildSurveySummary([
      {
        visitorId: "v1",
        completedAt: "2026-10-11T10:00:00.000Z",
        answers: {
          usefulness_score: 4,
          intended_use_cases: ["Подготовка преди ВиК проект"],
          intended_use_other: null,
          requested_capabilities: ["Кадастър и имоти", "Автоматичен доклад / PDF"],
          requested_capabilities_other: null,
          time_sink: "Събиране на изходни данни",
          time_sink_other: null,
          automation_need: "Събирането на кадастър",
          role: "ВиК проектант",
          role_other: null,
          organisation_work_frequency: "Всеки месец",
          workflow_stages: ["Предпроектен анализ"],
          workflow_stages_other: null,
          business_interest: "not_now",
          business_interest_label: "Не засега",
          contact: { name: "Скрито име", organisation: null, email: "hidden@example.com", phone: "0888000000", topic: null },
        },
      },
      {
        visitorId: "v1",
        completedAt: "2026-10-10T10:00:00.000Z",
        answers: { usefulness_score: 1, business_interest: "discuss", intended_use_cases: [], requested_capabilities: [], workflow_stages: [] },
      },
      {
        visitorId: "v2",
        completedAt: "2026-10-12T10:00:00.000Z",
        answers: {
          usefulness_score: 4,
          intended_use_cases: ["Подготовка преди ВиК проект", "Подготовка на оферта"],
          intended_use_other: null,
          requested_capabilities: ["Кадастър и имоти"],
          requested_capabilities_other: "По-ясна граница",
          time_sink: "Подготовка на оферта",
          time_sink_other: null,
          automation_need: null,
          role: "Консултант",
          role_other: null,
          organisation_work_frequency: "Почти постоянно",
          workflow_stages: ["Предпроектен анализ", "Документация"],
          workflow_stages_other: null,
          business_interest: "discuss",
          business_interest_label: "Да, бих искал да обсъдим",
          contact: null,
        },
      },
    ]);

    const usefulness = summary.groups[0];
    const interest = summary.groups[1];
    const uses = summary.groups.find((group) => group.title.startsWith("За какво"));
    const capabilities = summary.groups.find((group) => group.title.startsWith("Какво трябва"));
    const automation = summary.groups.find((group) => group.title.startsWith("Ако можехте"));
    const roles = summary.groups.find((group) => group.title === "Вашата роля");

    expect(summary.completed).toBe(2);
    expect(usefulness?.scale).toBe(true);
    expect(usefulness?.choices).toHaveLength(5);
    expect(usefulness?.choices.find((choice) => choice.label === "4")?.count).toBe(2);
    expect(usefulness?.choices.find((choice) => choice.label === "1")?.count).toBe(0);
    expect(interest?.choices.map((choice) => choice.count)).toEqual([1, 0, 1]);
    expect(interest?.hint).toContain("контакт");
    expect(uses?.choices.map((choice) => [choice.label, choice.count])).toEqual([
      ["Подготовка преди ВиК проект", 2],
      ["Подготовка на оферта", 1],
    ]);
    expect(capabilities?.choices[0]).toMatchObject({ label: "Кадастър и имоти", count: 2 });
    expect(capabilities?.notes.map((note) => note.text)).toEqual(["По-ясна граница"]);
    expect(automation?.choices).toEqual([]);
    expect(automation?.notes.map((note) => note.text)).toEqual(["Събирането на кадастър"]);
    expect(roles?.choices.map((choice) => choice.label)).toEqual(["ВиК проектант", "Консултант"]);
    expect(JSON.stringify(summary.groups)).not.toContain("hidden@example.com");
    expect(JSON.stringify(summary.groups)).not.toContain("Скрито име");
  });

  it("summarises a single completed survey without implying a distribution", () => {
    const result = snapshot({
      visitors: [visitor("v1", { surveyStatus: "completed_verified", surveyCompletedAt: "2026-10-11T10:00:00.000Z" })],
      surveys: [{
        visitorId: "v1",
        status: "completed",
        startedAt: "2026-10-11T09:50:00.000Z",
        completedAt: "2026-10-11T10:00:00.000Z",
        surveyVersion: 1,
        answers: {
          usefulness_score: 5,
          intended_use_cases: ["Подготовка преди ВиК проект", "Подготовка на оферта"],
          intended_use_other: null,
          requested_capabilities: ["Кадастър и имоти"],
          requested_capabilities_other: null,
          time_sink: "Събиране на изходни данни",
          time_sink_other: null,
          automation_need: null,
          role: "ВиК проектант",
          role_other: null,
          organisation_work_frequency: "Всеки месец",
          workflow_stages: ["Предпроектен анализ"],
          workflow_stages_other: null,
          business_interest: "info",
          business_interest_label: "Може би, изпратете ми повече информация",
          contact: null,
        },
      }],
    });
    expect(result.feedback.completed).toBe(1);
    expect(result.feedback.averageUsefulness).toBe(5);
    expect(result.feedback.single).toMatchObject({
      usefulness: 5,
      useCase: "Подготовка преди ВиК проект, Подготовка на оферта",
      pain: "Събиране на изходни данни",
      capability: "Кадастър и имоти",
    });
    expect(result.business.anonymousInterest).toBe(1);
    expect(result.business.contacts).toBe(0);
    expect(JSON.stringify(result.surveyRecords)).not.toContain("email");
  });
});
