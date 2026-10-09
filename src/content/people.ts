import type { Locale } from "@/lib/i18n";
import { isDevFixturesEnabled } from "./dev-fixtures";
import type { Person } from "./types";

export type PersonIntroVariant = "card" | "profile";

/**
 * Public team only. Names, roles and first-person copy are confirmed;
 * unverified employers, years, education and metrics stay out of the record.
 */
const confirmedPeople: Person[] = [
  {
    slug: "ivan-todorov",
    name: { bg: "Иван Тодоров", en: "Ivan Todorov" },
    axis: { bg: "Бизнес / Процеси", en: "Business / Processes" },
    role: {
      bg: "Основател и водещ консултант",
      en: "Founder & Lead Consultant",
    },
    expertise: {
      bg: ["Процеси", "Автоматизация", "Бизнес оптимизация", "Проследимост", "Корпоративни системи"],
      en: ["Processes", "Automation", "Business optimization", "Traceability", "Enterprise systems"],
    },
    cardBio: {
      bg: [
        "Анализирам работните процеси, откривам къде има нужда от подобрение и превръщам бизнес задачите в ясни изисквания.",
      ],
      en: [
        "I analyze workflows, identify opportunities for improvement and turn business needs into clear requirements.",
      ],
    },
    bio: {
      bg: [
        "Работя с бизнес процеси, автоматизация и приложението на ИИ в конкретна работна среда. Интересува ме не самият инструмент, а ефектът върху начина на работа: по-малко рутина, по-добра проследимост и повече време за решенията, които изискват човешка преценка.",
        "В проектите свързвам бизнес нуждата с техническото изпълнение, от формулирането на проблема и изискванията до тестовете и реалното използване.",
      ],
      en: [
        "I work on business processes, automation and the use of AI in a specific working environment. What matters to me is the effect on how work is done: less routine, clearer traceability and more time for decisions that need human judgment.",
        "I connect the business need with the technical work, from stating the problem and the requirements through to testing and actual use.",
      ],
    },
    portrait: {
      src: "/images/team/ivan-todorov-portrait-v2.jpg",
      width: 819,
      height: 1024,
    },
    projects: ["atn-warranty-portal"],
  },
  {
    slug: "ivan-tomchev",
    name: { bg: "Иван Томчев", en: "Ivan Tomchev" },
    axis: { bg: "Архитектура / Системи", en: "Architecture / Systems" },
    role: {
      bg: "Архитект на софтуерни и ИИ решения",
      en: "Software & AI Solutions Architect",
    },
    expertise: {
      bg: ["Софтуерна архитектура", "Интеграции", "Инфраструктура", "Локални и облачни модели", "Оркестрация"],
      en: ["Software architecture", "Integrations", "Infrastructure", "Local and cloud models", "Orchestration"],
    },
    cardBio: {
      bg: [
        "Проектирам как софтуерът, данните и ИИ да работят заедно, така че решенията да бъдат надеждни и подходящи за конкретната задача.",
      ],
      en: [
        "I design how software, data and AI work together to create reliable solutions tailored to each project's needs.",
      ],
    },
    bio: {
      bg: [
        "Фокусирам се върху техническата архитектура и реализацията: как различните системи, данни и модели да работят заедно надеждно и под контрол.",
        "Работя както с класически софтуерни системи, така и с архитектури, които комбинират локални и облачни ИИ модели според конкретната задача.",
      ],
      en: [
        "I focus on the technical architecture and the implementation: how systems, data and models work together reliably and under control.",
        "I work with conventional software and with architectures that combine local and cloud AI models according to the task.",
      ],
    },
    portrait: {
      src: "/images/team/ivan-tomchev-portrait-v2.jpg",
      width: 859,
      height: 1024,
    },
    projects: ["ai-assisted-solar-operations", "local-ai-orchestration"],
  },
  {
    slug: "nikolay-milkov",
    name: { bg: "Николай Милков", en: "Nikolay Milkov" },
    axis: { bg: "Разработка / Приложения", en: "Development / Applications" },
    role: {
      bg: "Разработчик на софтуерни приложения",
      en: "Software Application Developer",
    },
    expertise: { bg: [], en: [] },
    cardBio: {
      bg: [
        "Разработвам приложения и функционалности, които превръщат техническия проект в работещ и удобен за използване продукт.",
      ],
      en: [
        "I develop applications and features that turn technical designs into functional, user-friendly products.",
      ],
    },
    bio: {
      bg: [
        "Разработвам приложения и функционалности, които превръщат техническия проект в работещ и удобен за използване продукт.",
      ],
      en: [
        "I develop applications and features that turn technical designs into functional, user-friendly products.",
      ],
    },
    portrait: {
      src: "/images/team/nikolay-milkov-portrait.jpg",
      width: 819,
      height: 1024,
      objectPosition: "center 2%",
    },
  },
];

const DEV_JOIN_PLACEHOLDER_SLUG = "dev-fixture-researcher";

const devFixtures: Person[] = [
  {
    slug: DEV_JOIN_PLACEHOLDER_SLUG,
    name: { bg: "Тук може да си ти!", en: "This could be you!" },
    role: { bg: "Виж как да се включиш!", en: "See how to join." },
    expertise: { bg: [], en: [] },
    bio: {
      bg: ["Фикстура за разработка. Не се показва в публичния ITT сайт."],
      en: ["Development fixture. Not shown on the public ITT site."],
    },
  },
];

export const devFixturesEnabled = isDevFixturesEnabled();

export const people: Person[] = devFixturesEnabled ? [...confirmedPeople, ...devFixtures] : confirmedPeople;

/** No vacant “join us” slot on the public site. */
export const teamUpcomingCount = 0;

/** Confirmed public team in display order. Dev join fixtures stay out. */
export function teamMembers(): Person[] {
  return people.filter((person) => !isJoinPlaceholder(person));
}

export function joinSlotCount(visible: Person[]): number {
  if (visible.some((person) => person.slug === DEV_JOIN_PLACEHOLDER_SLUG)) return 0;
  return teamUpcomingCount;
}

export function isJoinPlaceholder(person: Person): boolean {
  return person.slug === DEV_JOIN_PLACEHOLDER_SLUG;
}

export function getPerson(slug: string): Person | undefined {
  return people.find((p) => p.slug === slug);
}

export function personEyebrow(person: Person, locale: Locale): string | undefined {
  return person.axis?.[locale] ?? person.role?.[locale];
}

export function personIntro(person: Person, locale: Locale, variant: PersonIntroVariant): string[] {
  if (variant === "card") return person.cardBio?.[locale] ?? person.bio[locale];
  return person.bio[locale];
}

export function withSeedPortrait(person: Person): Person {
  const seed = people.find((p) => p.slug === person.slug);
  if (!seed) return { ...person, links: publicProfileLinks(person) };
  return {
    ...person,
    portrait: person.portrait ?? seed.portrait,
    axis: person.axis ?? seed.axis,
    cardBio: person.cardBio ?? seed.cardBio,
    links: publicProfileLinks(person),
  };
}

export function isLinkedInUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return false;
  }
}

export function publicProfileLinks(person: Person): Array<{ label: string; url: string }> {
  return (person.links ?? []).filter((link) => !isLinkedInUrl(link.url));
}

export function linkedInHref(person: Person): string | undefined {
  for (const link of person.links ?? []) {
    if (isLinkedInUrl(link.url)) return link.url;
  }
  return undefined;
}

export function publicTeamList(fromCms: Person[]): Person[] {
  if (fromCms.length) {
    const bySlug = new Map(fromCms.map((p) => [p.slug, withSeedPortrait(p)]));
    const ordered = people.map((seed) => bySlug.get(seed.slug)).filter((p): p is Person => Boolean(p));
    const extras = fromCms.filter((p) => !people.some((seed) => seed.slug === p.slug)).map(withSeedPortrait);
    return [...ordered, ...extras];
  }
  return people;
}
