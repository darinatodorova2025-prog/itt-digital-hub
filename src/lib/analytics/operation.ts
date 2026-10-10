export const OPERATION_STATUSES = ["completed", "partial", "failed", "rate_limited", "invalid", "gated"] as const;

export type OperationStatus = (typeof OPERATION_STATUSES)[number];

export function operationSuccessful(status: OperationStatus): boolean {
  return status === "completed" || status === "partial";
}

export function classifyComparison(input: {
  error?: string | null;
  controlOk?: boolean;
  expertOk?: boolean;
}): OperationStatus {
  if (input.error === "rate_limited") return "rate_limited";
  if (input.error === "invalid_prompt") return "invalid";
  if (input.controlOk && input.expertOk) return "completed";
  if (input.controlOk || input.expertOk) return "partial";
  return "failed";
}

export function sourceCoverage(sourceCount: number, expertOk: boolean): "none" | "present" | "not_applicable" {
  if (!expertOk) return "not_applicable";
  return sourceCount > 0 ? "present" : "none";
}
