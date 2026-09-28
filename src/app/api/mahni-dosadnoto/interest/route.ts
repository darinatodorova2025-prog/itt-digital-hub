import type { NextRequest } from "next/server";
import { getMahniStore } from "@/mahni-dosadnoto/store";
import { readSessionTokenFromRequest } from "@/mahni-dosadnoto/session";
import { interestSchema } from "@/mahni-dosadnoto/validation";
import { jsonError, jsonOk } from "@/mahni-dosadnoto/server/http";

export async function POST(request: NextRequest) {
  const token = readSessionTokenFromRequest(request);
  if (!token) return jsonError("unauthorized", 401);
  const body = await request.json().catch(() => null);
  const parsed = interestSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid", 400);
  try {
    const store = getMahniStore();
    const result = await store.setInterest(token, parsed.data.themeId);
    return jsonOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "not_allowed") return jsonError("not_allowed", 409);
    return jsonError("failed", 500);
  }
}
