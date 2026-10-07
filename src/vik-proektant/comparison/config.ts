import { siteUrl } from "@/lib/site-url";
import { VIK_TOOL_NAMES } from "../engine/tools";

export const DEFAULT_COMPARISON_MODEL = "gpt-6.1-sol";
export const COMPARISON_MAX_OUTPUT_TOKENS = 2200;
export const COMPARISON_TIMEOUT_MS = 45_000;

export const CONTROL_INSTRUCTIONS =
  "You are a general-purpose assistant. Answer the user's question helpfully and accurately from general knowledge and from what the question itself states. Do not add a specialized procedure, a private document collection, or external tools unless the question calls for them.";

type Env = Record<string, string | undefined>;

export function comparisonModel(env: Env = process.env): string {
  const configured = env.VIK_COMPARISON_MODEL?.trim();
  return configured || DEFAULT_COMPARISON_MODEL;
}

export function comparisonModelLabel(env: Env = process.env): string {
  const model = comparisonModel(env);
  if (model === "gpt-6.1-sol" || model.startsWith("gpt-6.1-sol-")) return "GPT-6.1 Sol";
  return model;
}

export function publicMcpUrl(env: Env = process.env): string {
  const explicit = env.VIK_MCP_PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${siteUrl(env)}/api/mcp/vik`;
}

export function expertMcpTool(env: Env = process.env) {
  return {
    type: "mcp" as const,
    server_label: "vik",
    server_description: "ITT Digital Hub ViK Projektant: source retrieval and deterministic engineering calculations.",
    server_url: publicMcpUrl(env),
    require_approval: "never" as const,
    allowed_tools: [...VIK_TOOL_NAMES],
  };
}
