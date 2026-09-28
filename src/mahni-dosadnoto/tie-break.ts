import type { Theme } from "./types";

export type ThemeScoreRow = {
  theme: Theme;
  voteCount: number;
  interestOrgCount: number;
  submissionOrgCount: number;
};

/**
 * Deterministic human ranking tie-break (documented):
 * 1. vote count (desc)
 * 2. unique organizations with interest signals (desc)
 * 3. unique organizations in original submissions (desc)
 * 4. stable theme sortOrder (asc)
 * 5. theme id (asc)
 */
export function compareHumanRanking(a: ThemeScoreRow, b: ThemeScoreRow): number {
  if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
  if (b.interestOrgCount !== a.interestOrgCount) return b.interestOrgCount - a.interestOrgCount;
  if (b.submissionOrgCount !== a.submissionOrgCount) return b.submissionOrgCount - a.submissionOrgCount;
  if (a.theme.sortOrder !== b.theme.sortOrder) return a.theme.sortOrder - b.theme.sortOrder;
  return a.theme.id.localeCompare(b.theme.id);
}

export function rankHumanThemes(rows: ThemeScoreRow[]): ThemeScoreRow[] {
  return [...rows].sort(compareHumanRanking);
}

export type AiAggregateRow = {
  themeId: string;
  points: number;
  theme: Theme;
};

/** rank1=3, rank2=2, rank3=1; tie-break: points desc, then sortOrder, then id */
export function aggregateAiJury(
  picks: Array<{ themeId: string; rank: number }>,
  themes: Theme[],
): AiAggregateRow[] {
  const byId = new Map(themes.map((t) => [t.id, t]));
  const points = new Map<string, number>();
  for (const pick of picks) {
    const add = pick.rank === 1 ? 3 : pick.rank === 2 ? 2 : pick.rank === 3 ? 1 : 0;
    points.set(pick.themeId, (points.get(pick.themeId) ?? 0) + add);
  }
  const rows: AiAggregateRow[] = [...points.entries()].map(([themeId, pts]) => ({
    themeId,
    points: pts,
    theme: byId.get(themeId)!,
  }));
  return rows
    .filter((r) => r.theme)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.theme.sortOrder !== b.theme.sortOrder) return a.theme.sortOrder - b.theme.sortOrder;
      return a.themeId.localeCompare(b.themeId);
    });
}

export function overlapCount(humanTop3: string[], aiTop3: string[]): number {
  const ai = new Set(aiTop3);
  return humanTop3.filter((id) => ai.has(id)).length;
}
