import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FoundersPair } from "../src/components/people/FoundersPair";
import { peoplePage, home } from "../src/content/pages";
import {
  people,
  publicTeamList,
  teamUpcomingCount,
  joinSlotCount,
  linkedInHref,
  personIntro,
  withSeedPortrait,
} from "../src/content/people";

const TODOROV = "ivan-todorov";
const TOMCHEV = "ivan-tomchev";
const DRAFT = /TODO_CONTENT|TODO_VERIFY|TODO_ASSET/;
const OLD_ROLES =
  /Business Systems & AI Solutions Consultant|Business Systems & Applied AI Consultant|Консултант по бизнес системи и приложен ИИ|Консултант по бизнес системи и AI решения|Архитект на AI системи и софтуерен инженер/;
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
  it("lists the two complementary specialists with confirmed roles and portraits", () => {
    expect(people.map((p) => p.slug)).toEqual([TODOROV, TOMCHEV]);
    expect(people[0]?.portrait?.src).toBe("/images/team/ivan-todorov-portrait-v2.jpg");
    expect(people[0]?.name).toEqual({ bg: "Иван Тодоров", en: "Ivan Todorov" });
    expect(people[0]?.role).toEqual({
      bg: "Консултант по бизнес оптимизация и ИИ",
      en: "Business optimization and AI consultant",
    });
    expect(people[0]?.axis).toEqual({ bg: "Бизнес / Оптимизация", en: "Business / Optimization" });
    expect(people[1]?.name).toEqual({ bg: "Иван Томчев", en: "Ivan Tomchev" });
    expect(people[1]?.role).toEqual({
      bg: "Софтуерен инженер и архитект на системи",
      en: "Software engineer and systems architect",
    });
    expect(people[1]?.axis).toEqual({ bg: "Системи / Инженеринг", en: "Systems / Engineering" });
    expect(people[1]?.portrait?.src).toBe("/images/team/ivan-tomchev-portrait-v2.jpg");
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

  it("keeps first-person copy and drops unfinished or outdated profile claims", () => {
    for (const person of founders()) {
      const text = allProfileText(person);
      expect(text).not.toMatch(DRAFT);
      expect(text).not.toMatch(OLD_ROLES);
      expect(text).not.toMatch(THIRD_PERSON);
      expect(person.links).toBeUndefined();
      expect(linkedInHref(person)).toBeUndefined();
      expect(person.cardBio?.en.every((paragraph) => /^(I |At ITT Digital Hub, I )/.test(paragraph))).toBe(true);
      expect(person.cardBio?.bg.every((paragraph) => /^(Работя |Проектирам |Фокусирам |В ITT Digital Hub )/.test(paragraph))).toBe(
        true,
      );
    }
  });

  it("keeps seed order when CMS returns the same people shuffled", () => {
    const shuffled = [people[1]!, people[0]!];
    expect(publicTeamList(shuffled).map((p) => p.slug)).toEqual([TODOROV, TOMCHEV]);
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

    expect(card).toContain("I focus on the process");
    expect(card).not.toContain("I work on business processes, automation");
    expect(profile).toContain("I work on business processes, automation");
    expect(profile).toContain("Processes · Automation · Business optimization");
    expect(profile).toContain("Software architecture · Integrations · Infrastructure");
    expect(card).not.toMatch(/LinkedIn/i);
    expect(profile).not.toMatch(/LinkedIn/i);
    expect(card).not.toContain("TODO_CONTENT");
    expect(profile).not.toContain("TODO_CONTENT");
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
    expect(peoplePage.structure.heading.en).toContain("Two complementary roles.");
    expect(peoplePage.structure.heading.bg).toContain("Две допълващи се роли.");
    expect(blob).not.toMatch(/Two complementary specialists|One accountable team|small senior team|fewer handoffs|hard silos|rigid silos|one engagement|Business understanding ×|Двама допълващи се специалисти|отговорен екип|Малкият старши|по-малко предавания|твърди силози|един ангажимент|Бизнес разбиране ×/i);
  });
});

describe("homepage TEAM intro", () => {
  it("positions the team around problem-to-system delivery", () => {
    expect(home.people.heading.en).toBe("Business and engineering at the same table.");
    expect(home.people.heading.bg).toBe("Бизнесът и инженерството на една маса.");
    expect(home.people.lead.en).toContain("We work together from defining the problem");
    expect(home.people.lead.bg).toContain("Работим заедно от дефинирането на проблема");
    const blob = [home.people.label.en, home.people.label.bg, home.people.heading.en, home.people.heading.bg, home.people.lead.en, home.people.lead.bg].join("\n");
    expect(blob).not.toMatch(/Two complementary specialists|One accountable team|Direct contact|fewer handoffs|Директен контакт|малко предавания|Двама допълващи се специалисти|Един отговорен екип/i);
  });
});
