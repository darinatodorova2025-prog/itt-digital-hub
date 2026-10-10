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

/**
 * Next.js inlines only direct `process.env.NEXT_PUBLIC_*` reads into the browser bundle.
 * A dynamic lookup on the `process.env` object is empty in client code, so production
 * capture must use these explicit reads. Tests pass their own env object.
 */
function deploymentEnv(env?: Record<string, string | undefined>): Record<string, string | undefined> {
  if (env) return env;
  return {
    NODE_ENV: process.env.NODE_ENV,
    VITEST: process.env.VITEST,
    VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_POSTHOG_CAPTURE_DEV: process.env.NEXT_PUBLIC_POSTHOG_CAPTURE_DEV,
    POSTHOG_CAPTURE_DEV: process.env.POSTHOG_CAPTURE_DEV,
  };
}

export function appEnvironment(env?: Record<string, string | undefined>): AppEnvironment {
  const source = deploymentEnv(env);
  if (source.NODE_ENV === "test" || source.VITEST) return "test";
  const raw = source.NEXT_PUBLIC_APP_ENV || source.VERCEL_ENV || source.NODE_ENV;
  if (raw === "production" || raw === "preview" || raw === "development") return raw;
  return "development";
}

export function posthogProjectToken(env?: Record<string, string | undefined>): string | null {
  const token = deploymentEnv(env).NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!token || !token.startsWith("phc_")) return null;
  return token;
}

/** Client events go through the same-origin proxy. Server events use the EU ingest host directly. */
export function analyticsConfigured(env?: Record<string, string | undefined>): boolean {
  return posthogProjectToken(env) !== null;
}

export function captureEnabled(env?: Record<string, string | undefined>): boolean {
  const source = deploymentEnv(env);
  if (!posthogProjectToken(env)) return false;
  const environment = appEnvironment(env);
  if (environment === "test") return false;
  if (environment === "development") {
    return source.NEXT_PUBLIC_POSTHOG_CAPTURE_DEV === "1" || source.POSTHOG_CAPTURE_DEV === "1";
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
