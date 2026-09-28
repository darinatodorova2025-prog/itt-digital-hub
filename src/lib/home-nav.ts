import type { Locale } from "./i18n";
import { href, isAiActAgentPath, isAiActPath, isPipeThermalAnalysisPath, isSettlementAnalyzerPath, isToolsPath, isVikDesignerPath, isVikProektantPath, type RouteKey } from "./paths";

/** Homepage section ids in document order, for scroll spy. */
export const homeSpySectionIds = [
  "experience",
  "work",
  "problems",
  "judgement",
  "benefit",
  "approach",
  "people",
  "contact",
] as const;

export type HomeSpySectionId = (typeof homeSpySectionIds)[number];

/**
 * Hash target when the primary nav is used on the homepage.
 */
export const homeNavHash: Partial<Record<Exclude<RouteKey, "home" | "privacy">, HomeSpySectionId>> = {
  projects: "work",
  about: "problems",
  methodology: "approach",
  people: "people",
  "work-with-us": "contact",
};

const sectionToNav: Record<HomeSpySectionId, Exclude<RouteKey, "home" | "privacy">> = {
  experience: "projects",
  work: "projects",
  problems: "about",
  judgement: "about",
  benefit: "about",
  approach: "methodology",
  people: "people",
  contact: "work-with-us",
};

export function isHomePath(pathname: string): boolean {
  return /^\/(bg|en)\/?$/.test(pathname);
}

/** Fragment ids the landing page uses. A restored `#work` is not a fresh open. */
export function isHomeSectionHash(hash: string): boolean {
  const id = hash.replace(/^#/, "");
  return (homeSpySectionIds as readonly string[]).includes(id);
}

export function navKeyForHomeSection(sectionId: string): Exclude<RouteKey, "home" | "privacy"> | null {
  return sectionToNav[sectionId as HomeSpySectionId] ?? null;
}

/**
 * Deduplicated homepage scroll-spy progression (document order).
 */
export function homeSpyNavProgression(): Array<Exclude<RouteKey, "home" | "privacy">> {
  const keys: Array<Exclude<RouteKey, "home" | "privacy">> = [];
  for (const id of homeSpySectionIds) {
    const key = navKeyForHomeSection(id);
    if (!key || keys[keys.length - 1] === key) continue;
    keys.push(key);
  }
  return keys;
}

export function homeHashHref(locale: Locale, key: RouteKey): string | null {
  if (key === "home" || key === "privacy") return null;
  const hash = homeNavHash[key];
  if (!hash) return null;
  return `/${locale}#${hash}`;
}

/** Primary nav target: landing section when one exists, otherwise the inner route (Tools, Privacy). */
export function primaryNavHref(locale: Locale, key: RouteKey): string {
  return homeHashHref(locale, key) ?? href(locale, key);
}

/** Marks the current section from the pathname (e.g. /bg/projects/x → Work). */
export function isActivePath(pathname: string, linkHref: string): boolean {
  return pathname === linkHref || pathname.startsWith(`${linkHref}/`);
}

/** Tools stays current on every product surface under the catalogue. */
export function isNavItemActive(pathname: string, navKey: RouteKey, linkHref: string): boolean {
  if (
    navKey === "tools" &&
    (isToolsPath(pathname) ||
      isAiActAgentPath(pathname) ||
      isAiActPath(pathname) ||
      isSettlementAnalyzerPath(pathname) ||
      isPipeThermalAnalysisPath(pathname) ||
      isVikDesignerPath(pathname) ||
      isVikProektantPath(pathname))
  ) {
    return true;
  }
  return isActivePath(pathname, linkHref);
}
