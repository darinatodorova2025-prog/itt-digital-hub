import type { NextRequest } from "next/server";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { readSessionTokenFromRequest } from "@/mahni-dosadnoto/session";
import { jsonOk } from "@/mahni-dosadnoto/server/http";

export async function GET(request: NextRequest) {
  const store = getMahniStore();
  const campaign = await store.ensureCampaign();
  const token = readSessionTokenFromRequest(request);
  const ctx = await store.getParticipantContext(token);
  return jsonOk({
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
    interestThemeIds: ctx.interestThemeIds,
  });
}
