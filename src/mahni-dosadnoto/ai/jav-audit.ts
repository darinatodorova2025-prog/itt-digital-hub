import { z } from "zod";
import type { ThemeAuditRecord } from "../types";
import type { SemanticIdea } from "./semantic";
import type { DraftTheme } from "./synthesize";
import { VIK_EVENT_CONTEXT_VERSION } from "./vik-context";

/**
 * No JAV endpoint, model id, credential, or auth scheme exists in this repository.
 * These names describe the missing runtime contract. They are not a connection.
 */
export const JAV_MISSING_RUNTIME_CONTRACT = {
  configured: false,
  foundInRepository: false,
  missing: [
    "JAV endpoint URL: not present in code, migrations, or environment.",
    "JAV auth scheme and credential: not specified anywhere in this repository.",
    "JAV model id: not specified, and this build does not invent one.",
  ],
  responseMustMatch:
    "status pass|fail|split_recommended, clusterConfidence, ideas[].ideaId/belongs/confidence/reasonCode, unsupportedClaims, lostMeaning, reasonCodes",
} as const;

export type JavAuditInput = {
  contextVersion: string;
  title: string;
  description: string;
  ideas: Array<{ ideaId: string; body: string; role: string; frequency: string | null }>;
};

export type JavAuditDecision = {
  status: "pass" | "fail" | "split_recommended";
  clusterConfidence: number;
  ideas: Array<{ ideaId: string; belongs: boolean; confidence: number; reasonCode: string }>;
  unsupportedClaims: string[];
  lostMeaning: string[];
  reasonCodes: string[];
};

export const javDecisionSchema = z.object({
  status: z.enum(["pass", "fail", "split_recommended"]),
  clusterConfidence: z.number().min(0).max(1),
  ideas: z.array(
    z.object({
      ideaId: z.string().min(1),
      belongs: z.boolean(),
      confidence: z.number().min(0).max(1),
      reasonCode: z.string().trim().min(1).max(80),
    }),
  ),
  unsupportedClaims: z.array(z.string().trim().min(1).max(200)).max(12),
  lostMeaning: z.array(z.string().trim().min(1).max(200)).max(12),
  reasonCodes: z.array(z.string().trim().min(1).max(80)).max(12),
});

export interface JavAuditor {
  audit(input: JavAuditInput): Promise<JavAuditDecision>;
}

export class JavNotConfiguredError extends Error {
  readonly code = "audit_unavailable";
  readonly contract = JAV_MISSING_RUNTIME_CONTRACT;
  constructor() {
    super("audit_unavailable");
    this.name = "JavNotConfiguredError";
  }
}

/** Real JAV is not connected. Callers must record an operator override before review. */
export function createJavAuditor(): JavAuditor {
  return {
    async audit() {
      throw new JavNotConfiguredError();
    },
  };
}

export function scriptedJavAuditor(decide: (input: JavAuditInput) => JavAuditDecision): JavAuditor {
  return { audit: (input) => Promise.resolve(javDecisionSchema.parse(decide(input))) };
}

export function javDecisionPasses(decision: JavAuditDecision, ideaIds: string[]): boolean {
  if (decision.status !== "pass") return false;
  if (decision.unsupportedClaims.length > 0) return false;
  if (decision.lostMeaning.length > 0) return false;
  const byId = new Map(decision.ideas.map((idea) => [idea.ideaId, idea]));
  return ideaIds.every((id) => byId.get(id)?.belongs === true);
}

export function decisionToRecord(decision: JavAuditDecision | "unavailable"): ThemeAuditRecord {
  if (decision === "unavailable") {
    return {
      status: "unavailable",
      reasonCodes: ["audit_unavailable"],
      summary: "Одитът не е наличен. Темата не е одобрена.",
    };
  }
  const summary = [decision.status, ...decision.reasonCodes, ...decision.unsupportedClaims, ...decision.lostMeaning]
    .filter((part) => part.length > 0)
    .join("; ")
    .slice(0, 400);
  return {
    status: decision.status,
    reasonCodes: decision.reasonCodes.slice(0, 12),
    summary,
  };
}

export function auditInputFor(theme: Pick<DraftTheme, "title" | "description" | "ideaIds">, ideas: SemanticIdea[]): JavAuditInput {
  const byId = new Map(ideas.map((idea) => [idea.id, idea]));
  return {
    contextVersion: VIK_EVENT_CONTEXT_VERSION,
    title: theme.title,
    description: theme.description,
    ideas: theme.ideaIds.map((id) => {
      const idea = byId.get(id);
      return { ideaId: id, body: idea?.body ?? "", role: idea?.role ?? "", frequency: idea?.frequency ?? null };
    }),
  };
}
