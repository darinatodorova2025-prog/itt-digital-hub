import "server-only";

import { getMahniStore } from "@/mahni-dosadnoto/store";
import { readSessionTokenFromCookies } from "@/mahni-dosadnoto/session";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";
import type { EventPhase } from "@/mahni-dosadnoto/types";

/**
 * Shared server-side assembly of the participant's initial public context.
 *
 * This is the single source of truth for the shape consumed by
 * MahniParticipantApp. The API route (`/api/mahni-dosadnoto/context`) and the
 * Server Component page both build on this so business rules are not
 * duplicated between the two entry points.
 */
export type ParticipantInitialContext = {
  phase: EventPhase;
  campaignTitle: string;
  participant: { id: string; firstName: string; lastName: string; organization: string } | null;
  ideaCount: number;
  votesUsed: number;
  votesRemaining: number;
  votedThemeIds: string[];
  interestThemeIds: string[];
  followupThemeIds: string[];
};

export async function buildParticipantContext(token: string | null): Promise<ParticipantInitialContext> {
  const store = getMahniStore();
  const campaign = await store.ensureCampaign();
  const ctx = await store.getParticipantContext(token);
  return {
    phase: campaign.phase,
    campaignTitle: campaign.title,
    participant: ctx.participant
      ? {
          id: ctx.participant.id,
          firstName: ctx.participant.firstName,
          lastName: ctx.participant.lastName,
          organization: ctx.participant.organization,
        }
      : null,
    ideaCount: ctx.ideaCount,
    votesUsed: ctx.votesUsed,
    votesRemaining: Math.max(0, 3 - ctx.votesUsed),
    votedThemeIds: ctx.votedThemeIds,
    interestThemeIds: ctx.interestThemeIds,
    followupThemeIds: ctx.followupThemeIds,
  };
}

/**
 * Resolve the participant's initial context for the Server Component page.
 * Reads the session token from cookies (Server Components have no NextRequest).
 */
export async function getParticipantInitialState(): Promise<{
  context: ParticipantInitialContext;
  snapshot: PublicLiveSnapshot;
}> {
  const store = getMahniStore();
  const token = await readSessionTokenFromCookies();
  const [context, snapshot] = await Promise.all([buildParticipantContext(token), store.getPublicLiveSnapshot()]);
  return { context, snapshot };
}

/**
 * Resolve the live screen's initial snapshot for the Server Component page.
 */
export async function getLiveInitialSnapshot(): Promise<PublicLiveSnapshot> {
  const store = getMahniStore();
  return store.getPublicLiveSnapshot();
}
