import { AiActProviderError } from "@/lib/ai-act/errors";
import type { z } from "zod";
import { CLUSTERING_MODEL } from "./clustering-model";

type FetchLike = typeof fetch;

const CLUSTERING_TIMEOUT_MS = 180_000;
const CLUSTERING_MAX_OUTPUT_TOKENS = 16_000;

function modelMatches(returned: string, requested: string): boolean {
  return returned === requested || returned.startsWith(`${requested}-`);
}

function readModel(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("model" in payload)) return null;
  const model = (payload as { model?: unknown }).model;
  return typeof model === "string" ? model : null;
}

function safeProviderDetail(payload: unknown, status: number): string {
  const error = payload && typeof payload === "object" ? (payload as { error?: { code?: unknown; type?: unknown; message?: unknown } }).error : undefined;
  const type = typeof error?.type === "string" ? error.type : "";
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 180) : "";
  return ["OpenAI API request failed", String(status), type, code, message].filter((part) => part.length > 0).join(" ");
}

function readText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { output_text?: unknown; output?: unknown };
  if (typeof record.output_text === "string") return record.output_text;
  if (!Array.isArray(record.output)) return "";
  const parts: string[] = [];
  for (const item of record.output) {
    if (!item || typeof item !== "object") continue;
    const message = item as { type?: unknown; content?: unknown };
    if (message.type !== "message" || !Array.isArray(message.content)) continue;
    for (const content of message.content) {
      if (content && typeof content === "object" && typeof (content as { text?: unknown }).text === "string") {
        parts.push((content as { text: string }).text);
      }
    }
  }
  return parts.join("\n");
}

/**
 * Reads and combines ideas through the Responses API.
 * Jury calls stay on the shared provider and are not routed here.
 */
export async function completeClusteringJson<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
  options: { fetchImpl?: FetchLike; env?: Record<string, string | undefined> } = {},
): Promise<{ data: T; provider: string; model: string }> {
  const env = options.env ?? process.env;
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiActProviderError("not_configured", "OPENAI_API_KEY is not set", "openai");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLUSTERING_TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CLUSTERING_MODEL,
        store: false,
        max_output_tokens: CLUSTERING_MAX_OUTPUT_TOKENS,
        instructions: system,
        input: `${user}\n\nОтговори САМО с валиден JSON без markdown.`,
      }),
      signal: controller.signal,
    });

    let payload: unknown = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (response.status === 401 || response.status === 403) {
      throw new AiActProviderError("not_configured", "OpenAI API rejected the key", "openai");
    }
    if (response.status === 429) {
      throw new AiActProviderError("rate_limited", "OpenAI API rate limited", "openai");
    }
    if (!response.ok) {
      throw new AiActProviderError("provider_error", safeProviderDetail(payload, response.status), "openai");
    }

    const returned = readModel(payload);
    if (returned && !modelMatches(returned, CLUSTERING_MODEL)) {
      throw new Error("model_mismatch");
    }

    const text = readText(payload).trim();
    if (!text) {
      throw new AiActProviderError("provider_error", "OpenAI API returned no text", "openai");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    } catch {
      throw new Error("invalid_json");
    }

    return {
      data: schema.parse(parsed),
      provider: "openai",
      model: returned ?? CLUSTERING_MODEL,
    };
  } catch (error) {
    if (error instanceof AiActProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiActProviderError("timeout", "OpenAI API timed out", "openai");
    }
    if (error instanceof Error && (error.message === "invalid_json" || error.message === "model_mismatch" || error.name === "ZodError")) {
      throw error;
    }
    throw new AiActProviderError("network", "OpenAI API request failed", "openai");
  } finally {
    clearTimeout(timer);
  }
}
