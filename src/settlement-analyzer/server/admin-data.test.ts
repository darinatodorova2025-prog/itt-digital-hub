import { describe, expect, it } from "vitest";
import { buildAdminSnapshot } from "./admin-data";

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
  });
});
