const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const METRIC_KEYS = new Set(["input_tokens", "output_tokens", "total_tokens"]);

const DENIED_KEY = /prompt|password|secret|token|authorization|email|phone|answer|message|history|content|body|cookie|api[_-]?key|distinct[_-]?id|ip|address/i;

const ALLOWED_KEYS = new Set([
  "tool_id",
  "locale",
  "environment",
  "site",
  "analytics_source",
  "status",
  "confirmation",
  "successful",
  "fully_completed",
  "operation_id",
  "request_id",
  "correlated",
  "mode",
  "follow_up",
  "example_id",
  "topic_category",
  "prompt_length",
  "question_index",
  "is_repeat",
  "control_ok",
  "expert_ok",
  "control_error",
  "expert_error",
  "error_code",
  "retrieval_used",
  "source_count",
  "source_coverage",
  "calculation_performed",
  "model",
  "provider",
  "resolved_model",
  "fallback",
  "input_tokens",
  "output_tokens",
  "total_tokens",
  "estimated_cost_usd",
  "latency_ms",
  "duration_ms",
  "control_latency_ms",
  "expert_latency_ms",
  "fair",
  "source_index",
  "source_title",
  "ekatte",
  "settlement_name",
  "municipality",
  "region",
  "data_source",
  "result_count",
  "query_length",
  "layer",
  "enabled",
  "feature",
  "field",
  "h_out_mode",
  "flow_bucket",
  "delta_t_bucket",
  "insulation_bucket",
  "insulation_mm",
  "overlay_count",
  "advanced",
  "sequence",
  "first",
  "validation_fields",
  "wind",
  "from_locale",
  "to_locale",
  "from_tool",
  "target",
  "surface",
  "path",
  "step",
  "retry",
  "reason",
  "persisted",
  "depth",
  "survey_action",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

export type AnalyticsValue = string | number | boolean | null;

export function redactEmails(value: string): string {
  return value.replace(EMAIL, "[redacted-email]");
}

export function clip(value: string, max = 120): string {
  const clean = redactEmails(value).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export function sanitizeProperties(input: Record<string, unknown> | undefined): Record<string, AnalyticsValue> {
  const out: Record<string, AnalyticsValue> = {};
  if (!input) return out;
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (!METRIC_KEYS.has(key) && DENIED_KEY.test(key)) continue;
    const clean = cleanValue(value);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

function cleanValue(value: unknown): AnalyticsValue | undefined {
  if (typeof value === "string") return clip(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null) return null;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.slice(0, 8).map((item) => clip(item, 40)).join(",");
  }
  return undefined;
}

export function scrubBrowserProperties(properties: Record<string, unknown> | undefined): void {
  if (!properties) return;
  for (const key of Object.keys(properties)) {
    const value = properties[key];
    // PostHog stores the publishable project key on every event as `token`.
    // Removing it makes ingestion drop the event.
    if (key === "token" && typeof value === "string" && value.startsWith("phc_") && value.length < 80) continue;
    if (!key.startsWith("$") && !METRIC_KEYS.has(key) && DENIED_KEY.test(key)) {
      delete properties[key];
      continue;
    }
    if (typeof value === "string") properties[key] = clip(value, 180);
  }
}
