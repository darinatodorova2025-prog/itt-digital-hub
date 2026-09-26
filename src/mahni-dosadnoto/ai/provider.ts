import { readAiActConfig, providerKeyConfigured } from "@/lib/ai-act/config";
import { googleProvider } from "@/lib/ai-act/providers/google";
import { openaiProvider } from "@/lib/ai-act/providers/openai";
import type { z } from "zod";

export function readMahniAiConfig() {
  const base = readAiActConfig();
  const model = process.env.MAHNI_AI_MODEL?.trim() || base.model;
  return { ...base, model };
}

export async function completeJson<T>(schema: z.ZodType<T>, system: string, user: string): Promise<{ data: T; provider: string; model: string }> {
  const config = readMahniAiConfig();
  if (!providerKeyConfigured(config)) {
    throw new Error("not_configured");
  }
  const strictUser = `${user}\n\nОтговори САМО с валиден JSON без markdown.`;
  const provider = config.provider === "openai" ? openaiProvider : googleProvider;
  const result = await provider.complete({
    model: config.model,
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
  return { data, provider: result.provider, model: result.model };
}
