import { readResponseUsage } from "@/lib/analytics/usage";
import { COMPARISON_TIMEOUT_MS } from "./config";
import type { ComparisonSummary, SideFailure, SideSuccess } from "./observe";
import { collectExecution } from "./presentation";
import { buildComparisonRequests } from "./requests";

type FetchLike = typeof fetch;

export async function runComparison(
  userPrompt: string,
  options: { fetchImpl?: FetchLike; env?: Record<string, string | undefined>; timeoutMs?: number; cwd?: string; today?: string } = {},
): Promise<{
  model: string;
  control: SideSuccess | SideFailure;
  expert: SideSuccess | SideFailure;
  summary: ComparisonSummary;
  fair: boolean;
}> {
  const env = options.env ?? process.env;
  const requests = buildComparisonRequests(userPrompt, env, options.cwd, options.today);
  const [controlResult, expert] = await Promise.all([
    runSide(requests.control, requests.model, options),
    runSide(requests.expert, requests.model, options),
  ]);
  const controlLeakedTools = controlResult.ok && controlResult.toolNames.length > 0;
  const control = controlLeakedTools
    ? { ok: false as const, error: "upstream" as const, latencyMs: controlResult.latencyMs, resolvedModel: controlResult.resolvedModel }
    : controlResult;
  return {
    model: requests.model,
    control,
    expert,
    summary: {
      sourceCount: expert.ok ? expert.sources.length : 0,
      retrievalUsed: expert.ok ? expert.retrievalCount > 0 : false,
    },
    fair: isFair(control, expert, requests.model) && !controlLeakedTools,
  };
}

async function runSide(
  body: unknown,
  requestedModel: string,
  options: { fetchImpl?: FetchLike; env?: Record<string, string | undefined>; timeoutMs?: number },
): Promise<SideSuccess | SideFailure> {
  const started = Date.now();
  const env = options.env ?? process.env;
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "configuration", latencyMs: Date.now() - started, resolvedModel: null };
  const timeoutMs = options.timeoutMs ?? COMPARISON_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await (options.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return { ok: false, error: errorForStatus(response.status), latencyMs, resolvedModel: null };
    }
    const payload = (await response.json()) as unknown;
    const resolvedModel = readModel(payload);
    const usage = readResponseUsage(payload);
    if (resolvedModel && !modelMatches(resolvedModel, requestedModel)) {
      return { ok: false, error: "model_mismatch", latencyMs, resolvedModel, usage };
    }
    const text = readText(payload).trim();
    if (!text) return { ok: false, error: "empty", latencyMs, resolvedModel, usage };
    const tools = readTools(payload);
    return { ok: true, text, resolvedModel, latencyMs, usage, ...tools };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, error: aborted ? "timeout" : "upstream", latencyMs: Date.now() - started, resolvedModel: null };
  } finally {
    clearTimeout(timer);
  }
}

export function modelMatches(returned: string, requested: string): boolean {
  return returned === requested || returned.startsWith(`${requested}-`);
}

function errorForStatus(status: number): SideFailure["error"] {
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  return "upstream";
}

function isFair(control: SideSuccess | SideFailure, expert: SideSuccess | SideFailure, requested: string): boolean {
  const controlModel = control.resolvedModel;
  const expertModel = expert.resolvedModel;
  if (control.ok && controlModel && !modelMatches(controlModel, requested)) return false;
  if (expert.ok && expertModel && !modelMatches(expertModel, requested)) return false;
  if (controlModel && expertModel && controlModel !== expertModel) return false;
  if (control.ok && control.toolNames.length > 0) return false;
  return true;
}

function readModel(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.model !== "string") return null;
  return payload.model;
}

function readText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function readTools(payload: unknown): Pick<SideSuccess, "retrievalCount" | "sourceCount" | "toolNames" | "sources" | "toolKinds"> {
  const names: string[] = [];
  const outputs: string[] = [];
  walk(payload, names, outputs);
  const execution = collectExecution(names.map((name, index) => ({ name, output: outputs[index] ?? "" })));
  return {
    toolNames: names,
    retrievalCount: execution.retrievalCount,
    sourceCount: execution.sources.length,
    sources: execution.sources,
    toolKinds: execution.toolKinds,
  };
}

function walk(value: unknown, names: string[], outputs: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, names, outputs);
    return;
  }
  if (!isRecord(value)) return;
  if ((value.type === "mcp_call" || value.type === "mcp_tool_call") && typeof value.name === "string") {
    names.push(value.name);
    outputs.push(typeof value.output === "string" ? value.output : value.output ? JSON.stringify(value.output) : "");
  }
  for (const child of Object.values(value)) walk(child, names, outputs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
