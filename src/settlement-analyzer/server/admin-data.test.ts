import { describe, expect, it } from "vitest";
import { buildAdminSnapshot, buildSurveySummary } from "./admin-data";

describe("buildAdminSnapshot", () => {
  it("counts visitors, successful analyses, and contact requests", () => {
    const snapshot = buildAdminSnapshot({
      visitors: [
        { id: "v1", first_seen_at: "2026-10-10T08:00:00.000Z", last_seen_at: "2026-10-10T09:00:00.000Z", utm_source: "qr", utm_campaign: "summit", utm_content: null, survey_status: "completed_verified" },
        { id: "v2", first_seen_at: "2026-10-10T08:00:00.000Z", last_seen_at: "2026-10-10T08:20:00.000Z", utm_source: null, utm_campaign: null, utm_content: null, survey_status: "never_seen" },
      ],
      sessionVisitorIds: ["v1", "v1", "v2"],
      successfulRuns: [
        { visitorId: "v1", settlementName: "Банско" },
        { visitorId: "v1", settlementName: "Банско" },
        { visitorId: "v2", settlementName: "Разлог" },
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
      surveys: [],
    });

    expect(snapshot.kpis.visits).toBe(2);
    expect(snapshot.kpis.registrations).toBe(1);
    expect(snapshot.kpis.usersWithAnalysis).toBe(2);
    expect(snapshot.kpis.analyses).toBe(3);
    expect(snapshot.kpis.returnVisitors).toBe(1);
    expect(snapshot.kpis.completedProfiles).toBe(1);
    expect(snapshot.kpis.contactRequests).toBe(1);
    expect(snapshot.leads[0]).toMatchObject({
      fullName: "Иван",
      companyName: "Пример ООД",
      analysisCount: 2,
      settlements: ["Банско"],
      contactInterest: "Да, бих искал да обсъдим",
      sessionCount: 2,
    });
    expect(snapshot.leads[0].score).toBeGreaterThan(0);
    expect(snapshot.funnel.map((step) => step.label)).toEqual([
      "Посещения",
      "Първи анализ",
      "2+ анализа",
      "Започнат въпросник",
      "Попълнен профил",
      "Оставен контакт",
      "Заявка за разговор",
    ]);
    expect(snapshot.survey.completed).toBe(0);
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
    expect(usefulness.scale).toBe(true);
    expect(usefulness.choices).toHaveLength(5);
    expect(usefulness.choices.find((choice) => choice.label === "4")?.count).toBe(2);
    expect(usefulness.choices.find((choice) => choice.label === "1")?.count).toBe(0);
    expect(interest.choices.map((choice) => choice.count)).toEqual([1, 0, 1]);
    expect(interest.hint).toContain("таблицата");
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
});
