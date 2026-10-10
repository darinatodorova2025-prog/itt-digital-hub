"use client";

import posthog from "posthog-js";
import { campaignCookieValue, readCampaign, type CampaignProperties } from "@/lib/analytics/campaign";
import { analyticsBlockedPath, captureEnabled, replayAllowed } from "@/lib/analytics/config";
import { sanitizeProperties } from "@/lib/analytics/privacy";

const once = new Set<string>();
const questions = new Map<string, { count: number; last: string }>();
let lastSearchAt = 0;

export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!captureEnabled()) return;
  try {
    posthog.capture(event, sanitizeProperties({ ...properties, analytics_source: "client" }));
  } catch {
    // Analytics must never affect the product.
  }
}

export function captureOnce(key: string, event: string, properties?: Record<string, unknown>): void {
  if (once.has(key)) return;
  once.add(key);
  capture(event, properties);
}

export function captureFeature(toolId: string, feature: string, properties?: Record<string, unknown>): void {
  capture("tool_feature_used", { ...properties, tool_id: toolId, feature });
}

export function captureSearch(resultCount: number, queryLength: number, locale: string): void {
  const now = Date.now();
  if (now - lastSearchAt < 4000) return;
  lastSearchAt = now;
  capture("sa_search", {
    tool_id: "settlement-analyzer",
    locale,
    result_count: resultCount,
    query_length: queryLength,
  });
}

export function noteQuestion(toolId: string, prompt: string): { questionIndex: number; followUp: boolean; isRepeat: boolean } {
  const fingerprint = hashText(prompt.trim().toLowerCase());
  const current = questions.get(toolId) ?? { count: 0, last: "" };
  const count = current.count + 1;
  const isRepeat = current.last === fingerprint && fingerprint !== "0";
  questions.set(toolId, { count, last: fingerprint });
  return { questionIndex: count, followUp: count > 1, isRepeat };
}

export function beginTrackedOperation(
  toolId: string,
  prompt: string,
  properties?: Record<string, unknown>,
): { operationId: string; headers: Record<string, string>; questionIndex: number; followUp: boolean; isRepeat: boolean } {
  const noted = noteQuestion(toolId, prompt);
  const operationId = crypto.randomUUID();
  capture("tool_operation_started", {
    ...properties,
    tool_id: toolId,
    operation_id: operationId,
    question_index: noted.questionIndex,
    follow_up: noted.followUp,
    is_repeat: noted.isRepeat,
  });
  return {
    operationId,
    questionIndex: noted.questionIndex,
    followUp: noted.followUp,
    isRepeat: noted.isRepeat,
    headers: analyticsRequestHeaders(operationId, {
      "x-itt-question-index": String(noted.questionIndex),
      "x-itt-follow-up": noted.followUp ? "1" : "0",
      "x-itt-repeat": noted.isRepeat ? "1" : "0",
    }),
  };
}

export function analyticsRequestHeaders(operationId: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "x-itt-operation-id": operationId, ...extra };
  if (!captureEnabled()) return headers;
  try {
    const distinctId = posthog.get_distinct_id?.();
    const sessionId = posthog.get_session_id?.();
    if (typeof distinctId === "string" && distinctId.length > 1 && distinctId.length < 200) {
      headers["x-posthog-distinct-id"] = distinctId;
    }
    if (typeof sessionId === "string" && sessionId.length > 1 && sessionId.length < 200) {
      headers["x-posthog-session-id"] = sessionId;
    }
  } catch {
    // The product request still proceeds.
  }
  return headers;
}

export function registerContext(properties: Record<string, string>): void {
  if (!captureEnabled()) return;
  try {
    posthog.register(sanitizeProperties(properties));
  } catch {
    // ignore
  }
}

export function rememberCampaign(search: string, cookieHeader: string): CampaignProperties {
  const campaign = readCampaign(search, cookieHeader);
  if (typeof document === "undefined") return campaign;
  const fromUrl = readCampaign(search, null);
  if (Object.keys(fromUrl).length === 0) return campaign;
  const value = campaignCookieValue(fromUrl);
  if (!value) return campaign;
  document.cookie = `itt_utm=${value}; Path=/; Max-Age=2592000; SameSite=Lax`;
  return fromUrl;
}

export function syncReplay(pathname: string): void {
  if (!captureEnabled()) return;
  try {
    if (analyticsBlockedPath(pathname)) {
      posthog.stopSessionRecording();
      return;
    }
    const allowed = replayAllowed(pathname);
    let armed = allowed;
    try {
      if (allowed) window.sessionStorage.setItem("itt_replay", "1");
      armed = allowed || window.sessionStorage.getItem("itt_replay") === "1";
    } catch {
      armed = allowed;
    }
    if (armed) posthog.startSessionRecording();
  } catch {
    // ignore
  }
}

export function resetAnalyticsForTests(): void {
  once.clear();
  questions.clear();
  lastSearchAt = 0;
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
