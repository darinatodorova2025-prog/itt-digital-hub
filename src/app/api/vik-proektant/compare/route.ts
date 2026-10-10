import { exampleById } from "@/content/vik-proektant";
import { recordAiComparison } from "@/lib/analytics/record-comparison";
import { clientKey, promptHash, takeToken } from "@/vik-proektant/comparison/limits";
import { logVik } from "@/vik-proektant/comparison/observe";
import { runComparison } from "@/vik-proektant/comparison/run";
import { comparisonModel } from "@/vik-proektant/comparison/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PROMPT = 4000;
export const COMPARE_LIMIT = 20;
export const COMPARE_WINDOW_MS = 10 * 60_000;

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_prompt", requestId }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.prompt !== "string") {
    await recordAiComparison(request, {
      toolId: "vik-proektant",
      requestId,
      locale: "bg",
      exampleId: null,
      prompt: "",
      model: comparisonModel(),
      error: "invalid_prompt",
    });
    return Response.json({ error: "invalid_prompt", requestId }, { status: 400 });
  }
  const prompt = body.prompt.trim();
  if (prompt.length < 2 || prompt.length > MAX_PROMPT) {
    await recordAiComparison(request, {
      toolId: "vik-proektant",
      requestId,
      locale: body.locale === "en" ? "en" : "bg",
      exampleId: null,
      prompt,
      model: comparisonModel(),
      error: "invalid_prompt",
    });
    return Response.json({ error: "invalid_prompt", requestId }, { status: 400 });
  }
  const exampleId = typeof body.exampleId === "string" && exampleById(body.exampleId) ? body.exampleId : null;
  const locale = body.locale === "en" ? "en" : "bg";
  const slot = takeToken(`compare:${clientKey(request)}`, COMPARE_LIMIT, COMPARE_WINDOW_MS);
  if (!slot.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil(slot.retryAfterMs / 1000));
    await recordAiComparison(request, {
      toolId: "vik-proektant",
      requestId,
      locale,
      exampleId,
      prompt,
      model: comparisonModel(),
      error: "rate_limited",
    });
    return Response.json(
      { error: "rate_limited", retryAfterMs: slot.retryAfterMs, requestId },
      { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
    );
  }
  const started = Date.now();
  let result: Awaited<ReturnType<typeof runComparison>>;
  try {
    result = await runComparison(prompt);
  } catch (error) {
    await recordAiComparison(request, {
      toolId: "vik-proektant",
      requestId,
      locale,
      exampleId,
      prompt,
      model: comparisonModel(),
      error: "upstream",
      durationMs: Date.now() - started,
    });
    throw error;
  }
  const durationMs = Date.now() - started;
  const deployment = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  logVik({
    event: "comparison_completed",
    requestId,
    path: "control+expert",
    model: comparisonModel(),
    locale,
    exampleId,
    customPrompt: exampleId === null,
    promptHash: promptHash(prompt),
    controlOk: result.control.ok,
    expertOk: result.expert.ok,
    controlLatencyMs: result.control.latencyMs,
    expertLatencyMs: result.expert.latencyMs,
    controlError: result.control.ok ? null : result.control.error,
    expertError: result.expert.ok ? null : result.expert.error,
    retrievalCount: result.expert.ok ? result.expert.retrievalCount : 0,
    sourceCount: result.summary.sourceCount,
    calculationPerformed: result.summary.calculationPerformed,
    toolNames: result.expert.ok ? result.expert.toolNames.join(",") : "",
    fair: result.fair,
    durationMs,
    deployment,
  });
  await recordAiComparison(request, {
    toolId: "vik-proektant",
    requestId,
    locale,
    exampleId,
    prompt,
    model: comparisonModel(),
    durationMs,
    control: result.control,
    expert: result.expert,
    sourceCount: result.summary.sourceCount,
    retrievalUsed: result.summary.retrievalUsed,
    calculationPerformed: result.summary.calculationPerformed,
    fair: result.fair,
  });
  return Response.json({
    requestId,
    fair: result.fair,
    control: publicSide(result.control, false),
    expert: publicSide(result.expert, true),
    summary: result.summary,
  });
}

function publicSide(side: Awaited<ReturnType<typeof runComparison>>["control"], revealExecution: boolean) {
  if (!side.ok) return { ok: false as const, error: side.error };
  if (!revealExecution) return { ok: true as const, text: side.text };
  return {
    ok: true as const,
    text: side.text,
    sourceCount: side.sources.length,
    retrievalUsed: side.retrievalCount > 0,
    calculationPerformed: side.calculationPerformed,
    calculationInputRejected: side.calculationInputRejected,
    sources: side.sources,
    calculations: side.calculations,
    toolKinds: side.toolKinds,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
