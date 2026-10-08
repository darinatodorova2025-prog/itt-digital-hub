import type { Theme, ThemeReviewStatus } from "./types";

export function isVotingTheme(theme: Pick<Theme, "isAiWildcard" | "reviewStatus">): boolean {
  return !theme.isAiWildcard && theme.reviewStatus === "approved";
}

export function votingTransitionAllowed(
  themes: Array<Pick<Theme, "isAiWildcard" | "reviewStatus">>,
): { ok: true } | { ok: false; reason: "review_open" } {
  const real = themes.filter((theme) => !theme.isAiWildcard);
  if (real.length === 0 || real.some((theme) => theme.reviewStatus !== "approved")) {
    return { ok: false, reason: "review_open" };
  }
  return { ok: true };
}

export function isThemeReviewStatus(value: unknown): value is ThemeReviewStatus {
  return value === "pending" || value === "review_ready" || value === "approved" || value === "rework" || value === "audit_unavailable";
}
