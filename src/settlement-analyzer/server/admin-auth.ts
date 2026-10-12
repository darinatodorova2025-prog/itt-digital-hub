import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { getAdminSession, requireRole } from "@/lib/auth/session";
import { ADMIN_COOKIE, cookieOptions } from "./session";
import { isAdminRequest } from "./config";

/** Staff signed in with email and password, or a request that still carries the older owner cookie. */
export async function isAdminSession() {
  const session = await getAdminSession();
  if (requireRole(session)) return true;
  const cookieStore = await cookies();
  return isAdminRequest(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function writeAdminCookie(key: string) {
  const expected = process.env.LAND_SCOPE_ADMIN_KEY?.trim() ?? "";
  if (!expected || expected.length < 12) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, expected, { ...cookieOptions(), maxAge: 60 * 60 * 12 });
  return true;
}
