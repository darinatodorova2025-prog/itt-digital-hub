import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FoundersPair } from "../src/components/people/FoundersPair";
import { peoplePage, home } from "../src/content/pages";
import {
  people,
  publicTeamList,
  teamMembers,
  teamUpcomingCount,
  joinSlotCount,
  linkedInHref,
  personIntro,
  withSeedPortrait,
} from "../src/content/people";

const TODOROV = "ivan-todorov";
const TOMCHEV = "ivan-tomchev";
const MILKOV = "nikolay-milkov";
const DRAFT = /TODO_CONTENT|TODO_VERIFY|TODO_ASSET/;
const OLD_ROLES =
  /Business Systems & AI Solutions Consultant|Business Systems & Applied AI Consultant|Business Optimization & AI Consultant|Business Process & AI Consultant|Software & AI Systems Architect|Консултант по бизнес системи и приложен ИИ|Консултант по бизнес системи и AI решения|Консултант по бизнес оптимизация и ИИ|Консултант по бизнес процеси и ИИ|Архитект на софтуерни и ИИ системи|Архитект на AI системи и софтуерен инженер|Бизнес \/ Оптимизация|Системи \/ Инженеринг/;
const THIRD_PERSON =
  /\b(He |His |She |Ivan leads|Works from the process|Designs and builds complex|Работи от страна|Проектира и изгражда сложен)/;

function founders() {
  return people.filter((person) => person.slug === TODOROV || person.slug === TOMCHEV);
}

function allProfileText(person: (typeof people)[number]): string {
  return [
    person.axis?.bg,
    person.axis?.en,
    person.role?.bg,
    person.role?.en,
    ...(person.cardBio?.bg ?? []),
    ...(person.cardBio?.en ?? []),
    ...person.bio.bg,
    ...person.bio.en,
    ...person.expertise.bg,
    ...person.expertise.en,
  ]
    .filter(Boolean)
    .join("\n");
}

describe("public team", () => {
  it("lists the three team members in order with confirmed roles and portraits", () => {
    expect(people.map((p) => p.slug)).toEqual([TODOROV, TOMCHEV, MILKOV]);
    expect(teamMembers().map((p) => p.slug)).toEqual([TODOROV, TOMCHEV, MILKOV]);
    expect(people[0]?.portrait?.src).toBe("/images/team/ivan-todorov-portrait-v2.jpg");
    expect(people[0]?.name).toEqual({ bg: "Иван Тодоров", en: "Ivan Todorov" });
    expect(people[0]?.role).toEqual({
      bg: "Основател и водещ консултант",
      en: "Founder & Lead Consultant",
    });
    expect(people[0]?.axis).toEqual({ bg: "Бизнес / Процеси", en: "Business / Processes" });
    expect(people[0]?.cardBio?.bg).toEqual([
      "Анализирам работните процеси, откривам къде има нужда от подобрение и превръщам бизнес задачите в ясни изисквания.",
    ]);
    expect(people[0]?.cardBio?.en).toEqual([
      "I analyze workflows, identify opportunities for improvement and turn business needs into clear requirements.",
    ]);
    expect(people[1]?.name).toEqual({ bg: "Иван Томчев", en: "Ivan Tomchev" });
    expect(people[1]?.role).toEqual({
      bg: "Архитект на софтуерни и ИИ решения",
      en: "Software & AI Solutions Architect",
    });
    expect(people[1]?.axis).toEqual({ bg: "Архитектура / Системи", en: "Architecture / Systems" });
    expect(people[1]?.cardBio?.bg).toEqual([
      "Проектирам как софтуерът, данните и ИИ да работят заедно, така че решенията да бъдат надеждни и подходящи за конкретната задача.",
    ]);
    expect(people[1]?.cardBio?.en).toEqual([
      "I design how software, data and AI work together to create reliable solutions tailored to each project's needs.",
    ]);
    expect(people[1]?.portrait?.src).toBe("/images/team/ivan-tomchev-portrait-v2.jpg");
    const milkovCard =
      "Разработвам приложения и функционалности, които превръщат техническия проект в работещ и удобен за използване продукт.";
    const milkovCardEn =
      "I develop applications and features that turn technical designs into functional, user-friendly products.";
    expect(people[2]?.name).toEqual({ bg: "Николай Милков", en: "Nikolay Milkov" });
    expect(people[2]?.portrait?.src).toBe("/images/team/nikolay-milkov-portrait.jpg");
    expect(people[2]?.portrait?.objectPosition).toBe("center 2%");
    expect(people[2]?.role).toEqual({
      bg: "Разработчик на софтуерни приложения",
      en: "Software Application Developer",
    });
    expect(people[2]?.axis).toEqual({ bg: "Разработка / Приложения", en: "Development / Applications" });
    expect(people[2]?.cardBio).toEqual({ bg: [milkovCard], en: [milkovCardEn] });
    expect(people[2]?.bio).toEqual({ bg: [milkovCard], en: [milkovCardEn] });
    expect(people[2]?.expertise).toEqual({ bg: [], en: [] });
    expect(people[2]?.links).toBeUndefined();
    expect(people[2]?.projects).toBeUndefined();
  });

  it("keeps homepage cards shorter than About / People profiles", () => {
    for (const person of founders()) {
      expect(person.cardBio?.en?.length).toBeGreaterThan(0);
      expect(person.cardBio?.bg?.length).toBeGreaterThan(0);
      expect(person.bio.en.length).toBeGreaterThan(person.cardBio?.en?.length ?? 0);
      expect(person.bio.bg.length).toBeGreaterThan(0);
      expect(person.cardBio?.bg?.length).toBeLessThan(person.bio.bg.length);
      expect(personIntro(person, "en", "card").join("\n")).not.toBe(personIntro(person, "en", "profile").join("\n"));
      expect(personIntro(person, "bg", "card").join("\n")).not.toBe(personIntro(person, "bg", "profile").join("\n"));
    }
  });

  it("keeps Nikolay's profile to the approved sentence", () => {
    const person = people.find((item) => item.slug === MILKOV)!;
    expect(personIntro(person, "bg", "card")).toEqual(personIntro(person, "bg", "profile"));
    expect(personIntro(person, "en", "card")).toEqual(personIntro(person, "en", "profile"));
    expect(person.bio.bg).toHaveLength(1);
    expect(person.bio.en).toHaveLength(1);
  });

  it("keeps first-person copy and drops unfinished or outdated profile claims", () => {
    for (const person of people) {
      const text = allProfileText(person);
      expect(text).not.toMatch(DRAFT);
      expect(text).not.toMatch(OLD_ROLES);
      expect(text).not.toMatch(THIRD_PERSON);
      expect(person.links).toBeUndefined();
      expect(linkedInHref(person)).toBeUndefined();
      expect(person.cardBio?.en.every((paragraph) => /^(I |At ITT Digital Hub, I )/.test(paragraph))).toBe(true);
      expect(person.cardBio?.bg.every((paragraph) => /^(Анализирам |Работя |Проектирам |Фокусирам |Разработвам |В ITT Digital Hub )/.test(paragraph))).toBe(
        true,
      );
    }
  });

  it("keeps seed order when CMS returns the same people shuffled", () => {
    const shuffled = [people[2]!, people[0]!, people[1]!];
    expect(publicTeamList(shuffled).map((p) => p.slug)).toEqual([TODOROV, TOMCHEV, MILKOV]);
  });

  it("does not restore LinkedIn from seed records", () => {
    const withStaleLink = withSeedPortrait({
      ...people[0]!,
      links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/ivan-todorov-30152428/" }],
    });
    expect(linkedInHref(people[0]!)).toBeUndefined();
    expect(linkedInHref(people[1]!)).toBeUndefined();
    expect(withStaleLink.links).toEqual([]);
  });

  it("does not reserve a join-us vacancy on the public site", () => {
    expect(teamUpcomingCount).toBe(0);
    expect(joinSlotCount(people)).toBe(0);
  });

  it("renders short copy on cards and long copy on profiles, without LinkedIn chrome", () => {
    const card = renderToStaticMarkup(createElement(FoundersPair, { people: founders(), locale: "en", variant: "card" }));
    const profile = renderToStaticMarkup(
      createElement(FoundersPair, { people: founders(), locale: "en", variant: "profile" }),
    );

    expect(card).toContain("I analyze workflows, identify opportunities for improvement");
    expect(card).toContain("I design how software, data and AI work together");
    expect(card).not.toContain("I work on business processes, automation");
    expect(profile).toContain("I work on business processes, automation");
    expect(profile).toContain("Processes · Automation · Business optimization");
    expect(profile).toContain("Software architecture · Integrations · Infrastructure");
    expect(card).not.toMatch(/LinkedIn/i);
    expect(profile).not.toMatch(/LinkedIn/i);
    expect(card).not.toContain("TODO_CONTENT");
    expect(profile).not.toContain("TODO_CONTENT");
  });

  it("renders the three profiles in order on one roster, in both languages", () => {
    for (const locale of ["bg", "en"] as const) {
      const html = renderToStaticMarkup(createElement(FoundersPair, { people: teamMembers(), locale, variant: "card" }));
      const names =
        locale === "bg"
          ? ["Иван Тодоров", "Иван Томчев", "Николай Милков"]
          : ["Ivan Todorov", "Ivan Tomchev", "Nikolay Milkov"];
      const indexes = names.map((name) => html.indexOf(name));
      expect(indexes.every((index) => index >= 0)).toBe(true);
      expect(indexes[0]).toBeLessThan(indexes[1]!);
      expect(indexes[1]).toBeLessThan(indexes[2]!);
      expect(html).toContain("team-roster");
      expect(html).toContain("nikolay-milkov-portrait.jpg");
      expect(html).toContain(locale === "bg" ? "Основател и водещ консултант" : "Founder &amp; Lead Consultant");
      expect(html).toContain(locale === "bg" ? "Архитект на софтуерни и ИИ решения" : "Software &amp; AI Solutions Architect");
      expect(html).toContain(locale === "bg" ? "Разработчик на софтуерни приложения" : "Software Application Developer");
      expect(html).toContain(locale === "bg" ? "Разработвам приложения и функционалности" : "I develop applications and features");
      expect(html).not.toContain("TODO_CONTENT");
    }
  });
});

describe("About / People framing", () => {
  it("uses confident positioning copy instead of defensive small-team language", () => {
    const blob = [
      peoplePage.meta.description.en,
      peoplePage.meta.description.bg,
      peoplePage.heading.en,
      peoplePage.heading.bg,
      peoplePage.lead.en,
      peoplePage.lead.bg,
      peoplePage.structure.heading.en,
      peoplePage.structure.heading.bg,
      peoplePage.structureNote.en,
      peoplePage.structureNote.bg,
      peoplePage.team.label.en,
      peoplePage.team.label.bg,
    ].join("\n");

    expect(peoplePage.heading.en).toContain("Business and engineering at the same table.");
    expect(peoplePage.heading.bg).toContain("Бизнесът и инженерството на една маса.");
    expect(peoplePage.structure.heading.en).toContain("Complementary roles.");
    expect(peoplePage.structure.heading.bg).toContain("Допълващи се роли.");
    expect(peoplePage.structure.heading.en).not.toMatch(/\bTwo\b/);
    expect(peoplePage.structure.heading.bg).not.toMatch(/Две /);
    expect(blob).not.toMatch(/Two complementary specialists|One accountable team|small senior team|fewer handoffs|hard silos|rigid silos|one engagement|Business understanding ×|Двама допълващи се специалисти|отговорен екип|Малкият старши|по-малко предавания|твърди силози|един ангажимент|Бизнес разбиране ×/i);
  });
});

describe("homepage TEAM intro", () => {
  it("positions the team around problem-to-system delivery", () => {
    expect(home.people.heading.en).toBe("Different expertise. One team.");
    expect(home.people.heading.bg).toBe("Различни компетентности. Един екип.");
    expect(home.people.lead.en).toContain("We bring together experience in business processes");
    expect(home.people.lead.bg).toContain("Съчетаваме опит в бизнес процесите");
    const blob = [home.people.label.en, home.people.label.bg, home.people.heading.en, home.people.heading.bg, home.people.lead.en, home.people.lead.bg].join("\n");
    expect(blob).not.toMatch(/Two complementary specialists|One accountable team|Direct contact|fewer handoffs|Директен контакт|малко предавания|Двама допълващи се специалисти|Един отговорен екип/i);
  });
});
