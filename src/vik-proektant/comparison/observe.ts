import type { ModelUsage } from "@/lib/analytics/usage";
import type { PublicCalculation, PublicSource, ToolKind } from "./presentation";

export type SideName = "control" | "expert";

export type SideSuccess = {
  ok: true;
  text: string;
  resolvedModel: string | null;
  latencyMs: number;
  retrievalCount: number;
  sourceCount: number;
  calculationPerformed: boolean;
  calculationInputRejected: boolean;
  toolNames: string[];
  sources: PublicSource[];
  calculations: PublicCalculation[];
  toolKinds: ToolKind[];
  usage?: ModelUsage | null;
};

export type SideFailure = {
  ok: false;
  error: "timeout" | "upstream" | "configuration" | "model_mismatch" | "empty";
  latencyMs: number;
  resolvedModel: string | null;
  usage?: ModelUsage | null;
};

export type ComparisonSummary = {
  sourceCount: number;
  retrievalUsed: boolean;
  calculationPerformed: boolean;
  calculationInputRejected: boolean;
};

export function logVik(event: Record<string, string | number | boolean | null>): void {
  console.info(JSON.stringify({ service: "vik-proektant-v2", ...event }));
}
