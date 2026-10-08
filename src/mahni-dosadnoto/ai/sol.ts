import type { z } from "zod";
import type { completeClusteringJson } from "./clustering";

export type SolComplete = <T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
  options?: Parameters<typeof completeClusteringJson>[3],
) => Promise<{ data: T; provider: string; model: string }>;

export function asSolComplete(complete: typeof completeClusteringJson): SolComplete {
  return complete as SolComplete;
}
