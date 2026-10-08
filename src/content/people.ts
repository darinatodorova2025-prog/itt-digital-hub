import type { Locale } from "@/lib/i18n";
import { isDevFixturesEnabled } from "./dev-fixtures";
import type { Person } from "./types";

export type PersonIntroVariant = "card" | "profile";

/**
 * Public founders only. Names, roles and first-person copy are confirmed;
 * unverified employers, years, education and metrics stay out of the record.
 */
const confirmedPeople: Person[] = [
  {
    slug: "ivan-todorov",
    name: { bg: "Иван Тодоров", en: "Ivan Todorov" },
    axis: { bg: "Бизнес / Оптимизация", en: "Business / Optimization" },
    role: {
      bg: "Консултант по бизнес оптимизация и ИИ",
      en: "Business Optimization & AI Consultant",
    },
    expertise: {
      bg: ["Процеси", "Автоматизация", "Бизнес оптимизация", "Проследимост", "Корпоративни системи"],
      en: ["Processes", "Automation", "Business optimization", "Traceability", "Enterprise systems"],
    },
    cardBio: {
      bg: [
        "Анализирам работните процеси, изяснявам какво трябва да се подобри и свързвам бизнес нуждите с техническото изпълнение.",
      ],
      en: [
        "I analyze workflows, identify what needs to improve and connect business requirements with technical implementation.",
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
    axis: { bg: "Системи / Инженеринг", en: "Systems / Engineering" },
    role: {
      bg: "Архитект на софтуерни и ИИ системи",
      en: "Software & AI Systems Architect",
    },
    expertise: {
      bg: ["Софтуерна архитектура", "Интеграции", "Инфраструктура", "Локални и облачни модели", "Оркестрация"],
      en: ["Software architecture", "Integrations", "Infrastructure", "Local and cloud models", "Orchestration"],
    },
    cardBio: {
      bg: [
        "Проектирам техническата архитектура и изграждам системи, които обединяват софтуер, данни, интеграции и ИИ там, където има практическа полза.",
      ],
      en: [
        "I design technical architectures and build systems that bring together software, data, integrations and AI where they provide practical value.",
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

/** ITT is two people. No vacant “join us” slot on the public site. */
export const teamUpcomingCount = 0;

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
