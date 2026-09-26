import type { NextRequest } from "next/server";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { newSessionToken, readSessionTokenFromRequest, setSessionCookie } from "@/mahni-dosadnoto/session";
import { registrationSchema } from "@/mahni-dosadnoto/validation";
import { clientIp, jsonError, jsonOk, rateLimit } from "@/mahni-dosadnoto/server/http";

export async function POST(request: NextRequest) {
  if (!rateLimit(`md-reg:${clientIp(request)}`, 30, 60_000)) return jsonError("rate_limited", 429);
  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid", 400);
  const store = getMahniStore();
  let token = readSessionTokenFromRequest(request);
  if (!token) token = newSessionToken();
  const { participant, recovered } = await store.registerParticipant(parsed.data, token);
  await setSessionCookie(token);
  return jsonOk({ participant: { id: participant.id, firstName: participant.firstName, organization: participant.organization }, recovered });
}
