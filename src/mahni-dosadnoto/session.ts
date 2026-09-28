import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { hashSessionToken, newSessionToken } from "./session-crypto";

export { hashSessionToken, newSessionToken };

export const SESSION_COOKIE = "md_session";

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 2,
  };
}

export async function readSessionTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions());
}

export function readSessionTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}
