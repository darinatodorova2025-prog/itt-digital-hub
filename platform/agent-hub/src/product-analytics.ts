import { PostHog } from "posthog-node";

type HubOutcome = {
  agentId?: string;
  requestId?: string;
  status: "completed" | "failed" | "rate_limited";
  provider?: string;
  model?: string;
  fallback: boolean;
  durationMs?: number;
  errorCode?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
};

let client: PostHog | null | undefined;

function projectToken(): string | null {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!token?.startsWith("phc_")) return null;
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV;
  if (environment === "development" && process.env.POSTHOG_CAPTURE_DEV !== "1") return null;
  return token;
}

function hubClient(): PostHog | null {
  const token = projectToken();
  if (!token) return null;
  if (client !== undefined) return client;
  client = new PostHog(token, {
    host: "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export function toolIdForAgent(agentId: string | undefined): string {
  if (agentId === "ai-act") return "ai-act-agent";
  if (agentId === "vik-designer") return "vik-designer";
  if (agentId && /^[a-z0-9-]{2,40}$/.test(agentId)) return agentId;
  return "agent-hub";
}

/** One event per logical model completion. Prompts and answers stay out of the payload. */
export function captureHubModelOutcome(input: HubOutcome): void {
  const posthog = hubClient();
  if (!posthog) return;
  const requestId = input.requestId && /^[A-Za-z0-9_.:-]{2,80}$/.test(input.requestId) ? input.requestId : null;
  try {
    posthog.capture({
      distinctId: requestId ? `hub_${requestId}` : `hub_${crypto.randomUUID()}`,
      event: "ai_model_result",
      properties: {
        analytics_source: "server",
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "production",
        site: "ittdigitalhub.org",
        tool_id: toolIdForAgent(input.agentId),
        confirmation: "server",
        status: input.status,
        successful: input.status === "completed",
        fully_completed: input.status === "completed",
        correlated: false,
        mode: "hosted",
        provider: input.provider ?? null,
        model: input.model ?? null,
        fallback: input.fallback,
        error_code: input.errorCode ?? null,
        latency_ms: input.durationMs ?? null,
        duration_ms: input.durationMs ?? null,
        input_tokens: input.inputTokens ?? null,
        output_tokens: input.outputTokens ?? null,
        ...(requestId ? { request_id: requestId } : {}),
        ...(typeof input.estimatedCostUsd === "number" ? { estimated_cost_usd: input.estimatedCostUsd } : {}),
      },
    });
    void posthog.flush().catch(() => undefined);
  } catch {
    // Analytics must not change the model response.
  }
}
