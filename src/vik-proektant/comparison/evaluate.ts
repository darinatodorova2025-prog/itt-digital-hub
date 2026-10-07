import { isScore, type AnswerComparison } from "./score";

export const JEV_MODEL = "typesafe/jev-1.13";
export const JEV_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
export const JEV_TIMEOUT_MS = 20_000;

const MAX_FIELD_CHARS = 20_000;

const LEVELS = [
  "Answer B is materially worse than Answer A.",
  "Answer B is somewhat worse than Answer A.",
  "There is no meaningful difference.",
  "Answer B is meaningfully better than Answer A.",
  "Answer B is materially better than Answer A.",
];

const COMPARISON_RULES =
  "Compare only meaningful differences in the substantive content relevant to the user's question. Do not reward verbosity, answer length, number of bullets, formatting, markdown, confident tone, or professional-sounding language by itself. If there is no meaningful difference, choose the neutral level.";

type FetchLike = typeof fetch;
type Env = Record<string, string | undefined>;

export type EvaluationInput = {
  question: string;
  answerA: string;
  answerB: string;
};

export type EvaluationResult =
  | { ok: true; comparison: AnswerComparison }
  | { ok: false; error: "configuration" | "timeout" | "upstream" | "invalid" };

export function jevModel(env: Env = process.env): string {
  return env.OPENROUTER_JEV_MODEL?.trim() || JEV_MODEL;
}

export function buildEvaluationRequest(input: EvaluationInput, env: Env = process.env): {
  model: string;
  state: { question: string; answer_a: string; answer_b: string };
  questions: Record<string, { type: "score"; instructions: string; criteria: string[] }>;
} {
  return {
    model: jevModel(env),
    state: {
      question: clip(input.question),
      answer_a: clip(input.answerA),
      answer_b: clip(input.answerB),
    },
    questions: {
      grounding: scoreQuestion(
        "How much better or worse is Answer B than Answer A in making its conclusions traceable to relevant data, rules, sources, calculations, assumptions or explicitly stated grounds? Do not reward citations merely for appearing. Reward only sources or grounds that meaningfully support the answer. If the answer makes unsupported claims, this should reduce the score.",
      ),
      discipline: scoreQuestion(
        "How much better or worse is Answer B than Answer A in following disciplined engineering reasoning? Consider whether the answer recognizes when input data is insufficient, avoids inventing missing values or rules, recognizes ambiguity when present, states important assumptions, respects the limits of what can be concluded, avoids premature or unsupported final recommendations, and follows a sensible engineering sequence when relevant. Do not reward a response simply for being more detailed, longer or more cautious.",
      ),
      usefulness: scoreQuestion(
        "How much better or worse is Answer B than Answer A in helping the user make useful progress on the actual engineering task? Consider whether the answer gives a useful next step, helps the user understand what to check, provide, calculate or verify next, is actionable in the context of the question, and avoids unnecessary information that does not help move the task forward.",
      ),
    },
  };
}

export function parseEvaluationResponse(payload: unknown): AnswerComparison | null {
  if (!isRecord(payload) || !isRecord(payload.answers)) return null;
  const grounding = readScore(payload.answers.grounding);
  const discipline = readScore(payload.answers.discipline);
  const usefulness = readScore(payload.answers.usefulness);
  if (grounding === null || discipline === null || usefulness === null) return null;
  return {
    grounding: { score: grounding },
    discipline: { score: discipline },
    usefulness: { score: usefulness },
  };
}

export async function evaluateAnswerComparison(
  input: EvaluationInput,
  options: { fetchImpl?: FetchLike; env?: Env; timeoutMs?: number } = {},
): Promise<EvaluationResult> {
  const question = input.question.trim();
  const answerA = input.answerA.trim();
  const answerB = input.answerB.trim();
  if (question.length < 2 || !answerA || !answerB) return { ok: false, error: "invalid" };

  const env = options.env ?? process.env;
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "configuration" };

  const timeoutMs = options.timeoutMs ?? JEV_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await (options.fetchImpl ?? fetch)(JEV_DECISIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "http-referer": env.OPENROUTER_SITE_URL?.trim() || "https://ittdigitalhub.org",
        "x-openrouter-title": env.OPENROUTER_APP_NAME?.trim() || "ITT Digital Hub",
      },
      body: JSON.stringify(buildEvaluationRequest({ question, answerA, answerB }, env)),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: "upstream" };
    const payload = (await response.json()) as unknown;
    const comparison = parseEvaluationResponse(payload);
    if (!comparison) return { ok: false, error: "invalid" };
    return { ok: true, comparison };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, error: aborted ? "timeout" : "upstream" };
  } finally {
    clearTimeout(timer);
  }
}

function scoreQuestion(instructions: string) {
  return {
    type: "score" as const,
    instructions: `${instructions} ${COMPARISON_RULES}`,
    criteria: LEVELS,
  };
}

function readScore(value: unknown): number | null {
  if (!isRecord(value) || value.type !== "score" || !isScore(value.score)) return null;
  return value.score;
}

function clip(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > MAX_FIELD_CHARS ? trimmed.slice(0, MAX_FIELD_CHARS) : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
