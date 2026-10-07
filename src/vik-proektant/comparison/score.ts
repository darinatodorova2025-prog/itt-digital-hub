export type CriterionScore = { score: number };

export type AnswerComparison = {
  grounding: CriterionScore;
  discipline: CriterionScore;
  usefulness: CriterionScore;
};

export type ComparisonBand = "weaker" | "neutral" | "better";

const CRITERIA = ["grounding", "discipline", "usefulness"] as const;

export function comparisonBand(score: number): ComparisonBand {
  if (score < 1.5) return "weaker";
  if (score < 2.5) return "neutral";
  return "better";
}

export function isAnswerComparison(value: unknown): value is AnswerComparison {
  if (!isRecord(value)) return false;
  return CRITERIA.every((key) => {
    const criterion = value[key];
    return isRecord(criterion) && isScore(criterion.score);
  });
}

export function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 4;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
