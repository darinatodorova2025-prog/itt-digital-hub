import { readAiActConfig, providerKeyConfigured } from "@/lib/ai-act/config";
import type { AiProviderId } from "@/lib/ai-act/types";
import { googleProvider } from "@/lib/ai-act/providers/google";
import { openaiProvider } from "@/lib/ai-act/providers/openai";
import type { z } from "zod";
import { isTransientAiError } from "./transient-errors";

export function readMahniAiConfig() {
  const base = readAiActConfig();
  const model = process.env.MAHNI_AI_MODEL?.trim() || base.model;
  return { ...base, model };
}

function pickProvider(config: ReturnType<typeof readMahniAiConfig>, override?: AiProviderId) {
  const id = override ?? config.provider;
  if (id === "openai") {
    if (!config.openaiKeyConfigured) throw new Error("not_configured");
    return { id, impl: openaiProvider, model: config.model.includes("gpt") ? config.model : "gpt-4.1-mini" };
  }
  if (!config.googleKeyConfigured) throw new Error("not_configured");
  return { id, impl: googleProvider, model: config.model };
}

export async function completeJson<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
  providerOverride?: AiProviderId,
): Promise<{ data: T; provider: string; model: string }> {
  const config = readMahniAiConfig();
  if (!providerOverride && !providerKeyConfigured(config)) {
    throw new Error("not_configured");
  }
  const strictUser = `${user}\n\nОтговори САМО с валиден JSON без markdown.`;
  const { id, impl, model } = pickProvider(config, providerOverride);
  const result = await impl.complete({
    model,
    system,
    messages: [{ role: "user", content: strictUser }],
    timeoutMs: Math.max(config.timeoutMs, 60_000),
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
  } catch {
    throw new Error("invalid_json");
  }
  const data = schema.parse(parsed);
  return { data, provider: result.provider ?? id, model: result.model ?? model };
}

export async function completeJsonWithRetry<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
): Promise<{ data: T; provider: string; model: string }> {
  const config = readMahniAiConfig();
  try {
    return await completeJson(schema, system, user);
  } catch (primaryError) {
    const canFallback =
      config.provider === "google" &&
      config.openaiKeyConfigured &&
      isTransientAiError(primaryError) &&
      !(primaryError instanceof Error && primaryError.message === "not_configured");
    if (!canFallback) throw primaryError;
    return await completeJson(schema, system, user, "openai");
  }
}
