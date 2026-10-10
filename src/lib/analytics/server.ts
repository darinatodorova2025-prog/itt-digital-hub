import { PostHog } from "posthog-node";
import { appEnvironment, captureEnabled, POSTHOG_INGEST_HOST, posthogProjectToken } from "@/lib/analytics/config";
import { readAnalyticsContext } from "@/lib/analytics/identity";
import { sanitizeProperties } from "@/lib/analytics/privacy";

type HeaderSource = { get(name: string): string | null };

let client: PostHog | null | undefined;

function serverClient(): PostHog | null {
  if (client !== undefined) return client;
  const token = posthogProjectToken();
  if (!token) {
    client = null;
    return null;
  }
  client = new PostHog(token, {
    host: POSTHOG_INGEST_HOST,
    flushAt: 1,
    flushInterval: 0,
    featureFlagsPollingInterval: null,
  });
  return client;
}

export async function captureServerEvent(
  headers: HeaderSource,
  event: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (!captureEnabled()) return;
  const posthog = serverClient();
  if (!posthog) return;
  const identity = readAnalyticsContext(headers, crypto.randomUUID());
  try {
    const safe = sanitizeProperties({
      ...properties,
      analytics_source: "server",
      environment: appEnvironment(),
      site: "ittdigitalhub.org",
      correlated: identity.correlated,
      ...(identity.operationId ? { operation_id: identity.operationId } : {}),
    });
    posthog.capture({
      distinctId: identity.distinctId,
      event,
      properties: identity.sessionId ? { ...safe, $session_id: identity.sessionId } : safe,
    });
    await Promise.race([
      posthog.flush(),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
  } catch {
    // A failed analytics call must not change the product response.
  }
}

export function resetServerAnalyticsForTests(): void {
  client = undefined;
}
