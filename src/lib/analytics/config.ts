/** Public PostHog project for ittdigitalhub.org. The token is a publishable project key. */

export const POSTHOG_PROJECT_ID = "301034";
export const POSTHOG_UI_HOST = "https://eu.posthog.com";
export const POSTHOG_INGEST_HOST = "https://eu.i.posthog.com";
export const POSTHOG_PROXY_PATH = "/ingest";

export const TOOL_IDS = [
  "vik-proektant",
  "ai-act-assistant",
  "ai-act-agent",
  "settlement-analyzer",
  "pipe-thermal-analysis",
  "tools",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type AppEnvironment = "production" | "preview" | "development" | "test";

export function appEnvironment(env: Record<string, string | undefined> = process.env): AppEnvironment {
  if (env.NODE_ENV === "test" || env.VITEST) return "test";
  const raw = env.NEXT_PUBLIC_APP_ENV || env.VERCEL_ENV || env.NODE_ENV;
  if (raw === "production" || raw === "preview" || raw === "development") return raw;
  return "development";
}

export function posthogProjectToken(env: Record<string, string | undefined> = process.env): string | null {
  const token = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!token || !token.startsWith("phc_")) return null;
  return token;
}

/** Client events go through the same-origin proxy. Server events use the EU ingest host directly. */
export function analyticsConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return posthogProjectToken(env) !== null;
}

export function captureEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (!analyticsConfigured(env)) return false;
  const environment = appEnvironment(env);
  if (environment === "test") return false;
  if (environment === "development") {
    return env.NEXT_PUBLIC_POSTHOG_CAPTURE_DEV === "1" || env.POSTHOG_CAPTURE_DEV === "1";
  }
  return true;
}

/**
 * AI comparisons are confirmed on the Next.js server.
 * Pipe Thermal and Settlement Analyzer finish in the browser.
 * The hosted AI Act agent is confirmed in the browser until Agent Hub emits the same event.
 */
export function clientConfirmsOperation(toolId: string): boolean {
  return toolId === "pipe-thermal-analysis" || toolId === "settlement-analyzer" || toolId === "ai-act-agent";
}

export function toolIdFromPath(pathname: string): ToolId | null {
  if (pathname.includes("/vik-proektant")) return "vik-proektant";
  if (pathname.includes("/ai-act-agent")) return "ai-act-agent";
  if (pathname.includes("/ai-act")) return "ai-act-assistant";
  if (pathname.includes("/settlement-analyzer")) return "settlement-analyzer";
  if (pathname.includes("/pipe-thermal-analysis")) return "pipe-thermal-analysis";
  return null;
}

export function replayAllowed(pathname: string): boolean {
  if (pathname.includes("/admin") || pathname.includes("/mahni-dosadnoto")) return false;
  if (pathname.includes("/tools") || pathname.includes("/work-with-us")) return true;
  return toolIdFromPath(pathname) !== null;
}

export function analyticsBlockedPath(pathname: string): boolean {
  return pathname.includes("/admin") || pathname.includes("/mahni-dosadnoto");
}

export const TOOLS_ANALYTICS_PROJECT_URL = `${POSTHOG_UI_HOST}/project/${POSTHOG_PROJECT_ID}`;
