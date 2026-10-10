import type { ModelUsage } from "@/lib/analytics/usage";
import type { PublicSource, ToolKind } from "./presentation";

export type SideSuccess = {
  ok: true;
  text: string;
  resolvedModel: string | null;
  latencyMs: number;
  retrievalCount: number;
  sourceCount: number;
  toolNames: string[];
  sources: PublicSource[];
  toolKinds: ToolKind[];
  usage?: ModelUsage | null;
};

export type SideFailure = {
  ok: false;
  error: "timeout" | "upstream" | "configuration" | "model_mismatch" | "empty" | "rate_limited";
  latencyMs: number;
  resolvedModel: string | null;
  usage?: ModelUsage | null;
};

export type ComparisonSummary = {
  sourceCount: number;
  retrievalUsed: boolean;
};

export function logAiAct(event: Record<string, string | number | boolean | null>): void {
  console.info(JSON.stringify({ service: "ai-act-assistant", ...event }));
}
