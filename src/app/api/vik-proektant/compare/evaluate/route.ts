import { clientKey, promptHash, takeToken } from "@/vik-proektant/comparison/limits";
import { logVik } from "@/vik-proektant/comparison/observe";
import { evaluateAnswerComparison } from "@/vik-proektant/comparison/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PROMPT = 4000;
const MAX_ANSWER = 20_000;
const EVALUATE_LIMIT = 20;
const EVALUATE_WINDOW_MS = 10 * 60_000;

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "unavailable", requestId }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.question !== "string" || typeof body.answerA !== "string" || typeof body.answerB !== "string") {
    return Response.json({ error: "unavailable", requestId }, { status: 400 });
  }
  const question = body.question.trim();
  const answerA = body.answerA.trim();
  const answerB = body.answerB.trim();
  if (question.length < 2 || question.length > MAX_PROMPT || !answerA || !answerB || answerA.length > MAX_ANSWER || answerB.length > MAX_ANSWER) {
    return Response.json({ error: "unavailable", requestId }, { status: 400 });
  }

  const slot = takeToken(`evaluate:${clientKey(request)}`, EVALUATE_LIMIT, EVALUATE_WINDOW_MS);
  if (!slot.ok) {
    return Response.json({ error: "unavailable", requestId }, { status: 429 });
  }

  const started = Date.now();
  const result = await evaluateAnswerComparison({ question, answerA, answerB });
  logVik({
    event: "evaluation_completed",
    requestId,
    promptHash: promptHash(question),
    ok: result.ok,
    error: result.ok ? null : result.error,
    grounding: result.ok ? result.comparison.grounding.score : null,
    discipline: result.ok ? result.comparison.discipline.score : null,
    usefulness: result.ok ? result.comparison.usefulness.score : null,
    durationMs: Date.now() - started,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });
  if (!result.ok) return Response.json({ error: "unavailable", requestId }, { status: 503 });
  return Response.json(result.comparison);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
