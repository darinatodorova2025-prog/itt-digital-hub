import type { Locale } from "./i18n";
import { href, type RouteKey } from "./paths";

/** Public hierarchy. Labels are never raw URL slugs. */
export type CrumbId =
  | "home"
  | "work"
  | "solve"
  | "approach"
  | "tools"
  | "about"
  | "contact"
  | "privacy"
  | "vik"
  | "ai-act"
  | "ai-act-compare"
  | "settlement"
  | "settlement-privacy"
  | "pipe"
  | "project";

type CrumbNode = {
  label: { bg: string; en: string };
  parent?: CrumbId;
  route?: { key: RouteKey; slug?: string };
};

const nodes: Record<Exclude<CrumbId, "project">, CrumbNode> = {
  home: { label: { bg: "Начало", en: "Home" }, route: { key: "home" } },
  work: { label: { bg: "Работа", en: "Work" }, parent: "home", route: { key: "projects" } },
  solve: { label: { bg: "Какво решаваме", en: "What we solve" }, parent: "home", route: { key: "about" } },
  approach: { label: { bg: "Подход", en: "Approach" }, parent: "home", route: { key: "methodology" } },
  tools: { label: { bg: "Инструменти", en: "Tools" }, parent: "home", route: { key: "tools" } },
  about: { label: { bg: "За нас", en: "About" }, parent: "home", route: { key: "people" } },
  contact: { label: { bg: "Контакт", en: "Contact" }, parent: "home", route: { key: "work-with-us" } },
  privacy: { label: { bg: "Поверителност", en: "Privacy" }, parent: "home", route: { key: "privacy" } },
  vik: {
    label: { bg: "ВиК Проектант", en: "Water & Sewerage Designer" },
    parent: "tools",
    route: { key: "vik-proektant", slug: "compare" },
  },
  "ai-act": {
    label: { bg: "AI Act Assistant", en: "AI Act Assistant" },
    parent: "tools",
    route: { key: "ai-act", slug: "compare" },
  },
  "ai-act-compare": { label: { bg: "Сравнение", en: "Compare" }, parent: "ai-act" },
  settlement: {
    label: { bg: "Анализатор на населени места", en: "Settlement Analyzer" },
    parent: "tools",
    route: { key: "settlement-analyzer" },
  },
  "settlement-privacy": { label: { bg: "Поверителност", en: "Privacy" }, parent: "settlement" },
  pipe: {
    label: { bg: "Топлинен анализ", en: "Pipe Thermal Analysis" },
    parent: "tools",
    route: { key: "pipe-thermal-analysis" },
  },
};

/** Short current-page labels. Full project titles stay on the page. */
const projectLabels: Record<string, { bg: string; en: string }> = {
  "atn-warranty-portal": { bg: "Гаранционна платформа", en: "Warranty platform" },
  "ai-assisted-solar-operations": { bg: "Соларни паркове", en: "Solar parks" },
  "atn-creator-social-intelligence": { bg: "Създатели на съдържание", en: "Creator work" },
  "local-ai-orchestration": { bg: "Локална ИИ оркестрация", en: "Local AI orchestration" },
};

export type CrumbItem = {
  label: string;
  href?: string;
};

function nodeHref(locale: Locale, node: CrumbNode): string | undefined {
  if (!node.route) return undefined;
  return href(locale, node.route.key, node.route.slug);
}

function chain(leaf: Exclude<CrumbId, "project">): Array<Exclude<CrumbId, "project">> {
  const ids: Array<Exclude<CrumbId, "project">> = [];
  let cursor: CrumbId | undefined = leaf;
  while (cursor && cursor !== "project") {
    ids.unshift(cursor);
    cursor = nodes[cursor].parent;
  }
  return ids;
}

/** Ancestors are links. The current page is plain text. */
export function breadcrumbTrail(locale: Locale, leaf: CrumbId, currentLabel?: string): CrumbItem[] {
  if (leaf === "project") {
    const home = nodes.home;
    const work = nodes.work;
    return [
      { label: home.label[locale], href: nodeHref(locale, home) },
      { label: work.label[locale], href: nodeHref(locale, work) },
      { label: currentLabel?.trim() || work.label[locale] },
    ];
  }

  const ids = chain(leaf);
  return ids.map((id, index) => {
    const node = nodes[id];
    const last = index === ids.length - 1;
    return {
      label: node.label[locale],
      href: last ? undefined : nodeHref(locale, node),
    };
  });
}

export function projectCrumbLabel(locale: Locale, slug: string, title: string): string {
  return projectLabels[slug]?.[locale] ?? title;
}

export function homeCrumb(locale: Locale): CrumbItem {
  const home = nodes.home;
  return { label: home.label[locale], href: nodeHref(locale, home) };
}

/** Direct parent, for a local return action. */
export function parentCrumb(locale: Locale, leaf: CrumbId): CrumbItem | null {
  const trail = breadcrumbTrail(locale, leaf);
  const parent = trail[trail.length - 2];
  if (!parent?.href) return null;
  return parent;
}
