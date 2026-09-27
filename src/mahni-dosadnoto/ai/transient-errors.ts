import { AiActProviderError } from "@/lib/ai-act/errors";

const TRANSIENT_CODES = new Set(["rate_limited", "timeout", "network", "provider_error"]);

export function isTransientAiError(error: unknown): boolean {
  if (error instanceof AiActProviderError) {
    return TRANSIENT_CODES.has(error.code);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("rate limit") || msg.includes("timed out") || msg.includes("timeout") || msg.includes("503");
  }
  return false;
}
