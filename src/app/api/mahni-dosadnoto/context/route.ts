import type { NextRequest } from "next/server";
import { readSessionTokenFromRequest } from "@/mahni-dosadnoto/session";
import { buildParticipantContext } from "@/mahni-dosadnoto/server/initial-state";
import { handleStoreError, jsonOk } from "@/mahni-dosadnoto/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = readSessionTokenFromRequest(request);
    const context = await buildParticipantContext(token);
    return jsonOk(context);
  } catch (error) {
    return handleStoreError(error);
  }
}
