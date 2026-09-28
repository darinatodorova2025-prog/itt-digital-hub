import type { Theme } from "../types";

/** Themes for jury — explicitly excludes vote totals / human ranking. */
export function themesForJury(themes: Theme[]) {
  return themes.map(({ id, title, description, isAiWildcard, ideaCount, organizationCount }) => ({
    id,
    title,
    description,
    isAiWildcard,
    ideaCount,
    organizationCount,
  }));
}
