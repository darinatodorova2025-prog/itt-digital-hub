export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function readResponseUsage(payload: unknown): ModelUsage | null {
  if (!isRecord(payload) || !isRecord(payload.usage)) return null;
  const input = finite(payload.usage.input_tokens);
  const output = finite(payload.usage.output_tokens);
  const total = finite(payload.usage.total_tokens);
  if (input === null && output === null && total === null) return null;
  const inputTokens = input ?? 0;
  const outputTokens = output ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: total ?? inputTokens + outputTokens,
  };
}

export function addUsage(left: ModelUsage | null | undefined, right: ModelUsage | null | undefined): ModelUsage | null {
  if (!left && !right) return null;
  return {
    inputTokens: (left?.inputTokens ?? 0) + (right?.inputTokens ?? 0),
    outputTokens: (left?.outputTokens ?? 0) + (right?.outputTokens ?? 0),
    totalTokens: (left?.totalTokens ?? 0) + (right?.totalTokens ?? 0),
  };
}

/**
 * Prices are never guessed. A model is priced only when both rates are present
 * and greater than zero in ANALYTICS_MODEL_PRICES_JSON:
 * { "model-id": { "inputPerMillionUsd": 1.25, "outputPerMillionUsd": 10 } }
 */
export function estimateCostUsd(
  model: string,
  usage: ModelUsage | null,
  pricesJson = process.env.ANALYTICS_MODEL_PRICES_JSON,
): number | null {
  if (!usage || !pricesJson?.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(pricesJson);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed[model])) return null;
  const price = parsed[model];
  const inputRate = finite(price.inputPerMillionUsd);
  const outputRate = finite(price.outputPerMillionUsd);
  if (inputRate === null || outputRate === null || inputRate <= 0 || outputRate <= 0) return null;
  const cost = (usage.inputTokens * inputRate + usage.outputTokens * outputRate) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
