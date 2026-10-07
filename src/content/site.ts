import type { L, Locale } from "@/lib/i18n";
import type { RouteKey } from "@/lib/paths";

export const site = {
  name: {
    bg: "ITT Digital Hub",
    en: "ITT Digital Hub",
  } satisfies L,
  /** Two-line header lockup; `name` stays the single-line form for metadata. */
  nameLines: {
    bg: ["ITT", "Digital Hub"],
    en: ["ITT", "Digital Hub"],
  } satisfies { bg: readonly [string, string]; en: readonly [string, string] },
  short: { bg: "ITT", en: "ITT" } satisfies L,
  descriptor: {
    bg: "Оптимизация на процеси и системи",
    en: "Process Optimization & Software Systems",
  } satisfies L,
  /** Broader lockup used where a short descriptor is not enough. Not a parent institution. */
  anchor: {
    bg: "Бизнес процеси · Данни · Софтуерни системи",
    en: "Business processes · Data · Software systems",
  } satisfies L,
  anchorShort: { bg: "ITT", en: "ITT" } satisfies L,
  description: {
    bg: "ITT Digital Hub помага на екипи да подредят информацията, да оптимизират работните процеси и да свържат системите си чрез автоматизация, специализиран софтуер и ИИ там, където той има практическа полза.",
    en: "ITT Digital Hub helps teams organize information, improve how work is done and connect their systems, using automation, purpose-built software and AI where it is practically useful.",
  } satisfies L,
  contactNote: {
    bg: "Директен контакт:",
    en: "Direct contact:",
  } satisfies L,
};

export const contactEmail = "office@ittdigitalhub.org";

export const contactPhones = ["+359 895 581 911", "+359 899 811 455"] as const;

/** Second footer phone. Set to true when it should be public again. */
export const showSecondaryContactPhone = false;

export interface NavItem {
  key: RouteKey;
  label: L;
}

export const primaryNav: NavItem[] = [
  { key: "projects", label: { bg: "Работа", en: "Work" } },
  { key: "about", label: { bg: "Какво решаваме", en: "What we solve" } },
  { key: "methodology", label: { bg: "Подход", en: "Approach" } },
  { key: "tools", label: { bg: "Инструменти", en: "Tools" } },
  { key: "people", label: { bg: "За нас", en: "About" } },
  { key: "work-with-us", label: { bg: "Контакт", en: "Contact" } },
];

export const footerPrivacy: NavItem = { key: "privacy", label: { bg: "Поверителност", en: "Privacy" } };

export const footerNav: NavItem[] = [...primaryNav, footerPrivacy];

/** Compact footer links for each public tool. The game surfaces sit underneath, quieter. */
export interface FooterProductLink {
  id: string;
  label: L;
  key: RouteKey;
  slug?: string;
  /** The game exists only in Bulgarian. */
  locale?: Locale;
}

export const footerProducts: FooterProductLink[] = [
  { id: "vik-proektant", label: { bg: "ВиК Проектант", en: "Water & sewerage" }, key: "vik-proektant", slug: "compare" },
  { id: "pipe-thermal", label: { bg: "Топлинен анализ", en: "Pipe thermal" }, key: "pipe-thermal-analysis" },
  { id: "ai-act", label: { bg: "AI Act", en: "AI Act" }, key: "ai-act", slug: "compare" },
  { id: "settlement", label: { bg: "ВиК анализ", en: "Settlement analysis" }, key: "settlement-analyzer" },
];

/** Quiet entry points for the game. Visible only if you look for them. */
export const footerMahniSurfaces: { id: string; label: L; href: string }[] = [
  { id: "phone", label: { bg: "Телефон", en: "Phone" }, href: "/bg/mahni-dosadnoto" },
  { id: "live", label: { bg: "Лайв екран", en: "Live screen" }, href: "/bg/mahni-dosadnoto/live" },
  { id: "admin", label: { bg: "Админ", en: "Admin" }, href: "/admin/mahni-dosadnoto" },
];
