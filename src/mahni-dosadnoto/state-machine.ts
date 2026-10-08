import type { EventPhase } from "./types";

/** Allowed admin transitions (from → to). Idempotent self-transitions are handled separately. */
const TRANSITIONS: Record<EventPhase, EventPhase[]> = {
  DRAFT: ["COLLECTING"],
  COLLECTING: ["ANALYZING"],
  ANALYZING: ["VOTING"],
  VOTING: ["FINALIZING"],
  FINALIZING: ["AI_JURY", "RESULTS"],
  AI_JURY: ["RESULTS"],
  RESULTS: ["CLOSED"],
  CLOSED: [],
};

export function canTransition(from: EventPhase, to: EventPhase): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: EventPhase, to: EventPhase): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid phase transition: ${from} → ${to}`);
  }
}

export function ideasAllowed(phase: EventPhase): boolean {
  return phase === "COLLECTING";
}

export function votingAllowed(phase: EventPhase, votingEndsAt: string | null, now = Date.now()): boolean {
  if (phase !== "VOTING" && phase !== "FINALIZING") return false;
  if (phase === "FINALIZING") return false;
  if (votingEndsAt && Date.parse(votingEndsAt) <= now) return false;
  return true;
}

export function interestAllowed(phase: EventPhase): boolean {
  return phase === "VOTING" || phase === "RESULTS" || phase === "CLOSED";
}

export function followupAllowed(phase: EventPhase): boolean {
  return phase === "RESULTS" || phase === "CLOSED";
}
