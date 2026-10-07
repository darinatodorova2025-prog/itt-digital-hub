import "server-only"

import { createHmac, randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { isAdminSession } from "@/settlement-analyzer/server/admin-auth"
import { CONTACT_COOKIE } from "@/settlement-analyzer/server/session"
import { cleanText } from "@/settlement-analyzer/server/security"
import { SESSION_COOKIE, VISITOR_COOKIE } from "@/settlement-analyzer/beta/config"
import type { AttributionInput } from "@/settlement-analyzer/beta/engine"
import { createSupabaseServerClient } from "@/lib/cms/supabase-server"
import { createSupabaseServiceClient, supabaseServiceRoleConfigured } from "@/lib/cms/supabase-service"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID.test(value))
}

export function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }
}

export async function readBetaCookies(request: NextRequest) {
  const cookieStore = await cookies()
  const headerVisitor = request.headers.get("x-sa-beta-visitor")
  return {
    visitorCookie: isUuid(cookieStore.get(VISITOR_COOKIE)?.value) ? cookieStore.get(VISITOR_COOKIE)!.value : null,
    sessionCookie: isUuid(cookieStore.get(SESSION_COOKIE)?.value) ? cookieStore.get(SESSION_COOKIE)!.value : null,
    visitorHeader: isUuid(headerVisitor) ? headerVisitor : null,
    contactId: cleanText(cookieStore.get(CONTACT_COOKIE)?.value, 80) || null,
  }
}

export async function writeBetaCookies(visitorId: string, sessionId: string) {
  const cookieStore = await cookies()
  cookieStore.set(VISITOR_COOKIE, visitorId, { ...cookieBase(), maxAge: 60 * 60 * 24 * 365 })
  cookieStore.set(SESSION_COOKIE, sessionId, cookieBase())
}

export function abuseSignal(request: NextRequest) {
  const secret = process.env.CIT_ADMIN_SESSION_SECRET?.trim()
  if (!secret || secret.length < 16) return null
  const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "").split(",")[0]?.trim() ?? ""
  const ua = request.headers.get("user-agent") ?? ""
  const day = new Date().toISOString().slice(0, 10)
  return createHmac("sha256", secret).update(`${day}|${ip}|${ua}`).digest("hex").slice(0, 32)
}

export function deviceContext(userAgent: string | null) {
  const ua = userAgent ?? ""
  const deviceCategory = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop"
  const browserFamily = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) && !/Edg\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other"
  const osFamily = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS X/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Other"
  return { deviceCategory, browserFamily, osFamily }
}

export function attributionFrom(request: NextRequest, body: Record<string, unknown>): AttributionInput {
  const params = request.nextUrl.searchParams
  const pick = (key: string, max = 120) => cleanText(body[key], max) || cleanText(params.get(key), max) || null
  const landing = cleanText(body.landingPage, 300)
  const device = deviceContext(request.headers.get("user-agent"))
  const width = clampInt(body.viewportWidth)
  const height = clampInt(body.viewportHeight)
  return {
    landingPage: landing.startsWith("/") ? landing : null,
    referrer: cleanText(body.referrer, 300) || null,
    utmSource: pick("utmSource") || pick("utm_source"),
    utmMedium: pick("utmMedium") || pick("utm_medium"),
    utmCampaign: pick("utmCampaign") || pick("utm_campaign"),
    utmContent: pick("utmContent") || pick("utm_content"),
    utmTerm: pick("utmTerm") || pick("utm_term"),
    locale: cleanText(body.locale, 8) || null,
    language: cleanText(body.language, 35) || null,
    timezone: cleanText(body.timezone, 80) || null,
    deviceCategory: device.deviceCategory,
    browserFamily: device.browserFamily,
    osFamily: device.osFamily,
    viewportWidth: width,
    viewportHeight: height,
  }
}

function clampInt(value: unknown) {
  const number = typeof value === "number" ? value : Number.NaN
  if (!Number.isFinite(number)) return null
  return Math.max(0, Math.min(10_000, Math.round(number)))
}

export async function isPrivilegedRequest() {
  if (await isAdminSession()) return true
  return isInternalAccount()
}

async function isInternalAccount() {
  if (!supabaseServiceRoleConfigured()) return false
  try {
    const sessionClient = await createSupabaseServerClient()
    const { data } = await sessionClient.auth.getUser()
    const userId = data.user?.id
    if (!isUuid(userId)) return false
    const service = createSupabaseServiceClient()
    const { data: staff, error } = await service.from("staff").select("user_id").eq("user_id", userId).maybeSingle()
    if (error) return false
    return Boolean(staff)
  } catch {
    return false
  }
}

export async function authenticatedUserId() {
  if (!supabaseServiceRoleConfigured()) return null
  try {
    const sessionClient = await createSupabaseServerClient()
    const { data } = await sessionClient.auth.getUser()
    return isUuid(data.user?.id) ? data.user.id : null
  } catch {
    return null
  }
}

export function newId() {
  return randomUUID()
}
