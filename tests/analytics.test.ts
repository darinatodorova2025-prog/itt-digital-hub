import { describe, expect, it } from "vitest";
import { campaignCookieValue, readCampaign } from "../src/lib/analytics/campaign";
import { appEnvironment, captureEnabled, clientConfirmsOperation, toolIdFromPath } from "../src/lib/analytics/config";
import { cleanAnalyticsId, readAnalyticsContext, readQuestionContext } from "../src/lib/analytics/identity";
import { classifyComparison, operationSuccessful, sourceCoverage } from "../src/lib/analytics/operation";
import { changedLayers, deltaTBucket, flowBucket, insulationBucket } from "../src/lib/analytics/pipe";
import { sanitizeProperties } from "../src/lib/analytics/privacy";
import { classifyTopic, topicForQuestion } from "../src/lib/analytics/topics";
import { estimateCostUsd } from "../src/lib/analytics/usage";
import { toolIdForAgent } from "../platform/agent-hub/src/product-analytics";

describe("tools analytics", () => {
  it("keeps test and unconfigured environments from sending events", () => {
    expect(appEnvironment({ NODE_ENV: "test" })).toBe("test");
    expect(captureEnabled({ NODE_ENV: "test", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_test" })).toBe(false);
    expect(captureEnabled({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
    expect(captureEnabled({ NODE_ENV: "production", VERCEL_ENV: "production", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_live" })).toBe(true);
    expect(captureEnabled({ NODE_ENV: "development", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_live" })).toBe(false);
  });

  it("maps tool routes and confirms browser-finished tools on the client", () => {
    expect(toolIdFromPath("/bg/vik-proektant/compare")).toBe("vik-proektant");
    expect(toolIdFromPath("/en/ai-act/compare")).toBe("ai-act-assistant");
    expect(toolIdFromPath("/bg/ai-act-agent/use")).toBe("ai-act-agent");
    expect(toolIdFromPath("/bg/settlement-analyzer")).toBe("settlement-analyzer");
    expect(toolIdFromPath("/bg/pipe-thermal-analysis")).toBe("pipe-thermal-analysis");
    expect(toolIdFromPath("/bg/about")).toBeNull();
    expect(clientConfirmsOperation("pipe-thermal-analysis")).toBe(true);
    expect(clientConfirmsOperation("vik-proektant")).toBe(false);
  });

  it("drops prompts, secrets and direct identifiers while keeping model metrics", () => {
    const safe = sanitizeProperties({
      tool_id: "vik-proektant",
      prompt: "full question",
      answer: "full answer",
      email: "person@example.com",
      input_tokens: 12,
      output_tokens: 20,
      source_title: "Наредба № 4",
      status: "completed",
    });
    expect(safe).toEqual({
      tool_id: "vik-proektant",
      input_tokens: 12,
      output_tokens: 20,
      source_title: "Наредба № 4",
      status: "completed",
    });
    expect(JSON.stringify(safe)).not.toContain("person@example.com");
  });

  it("reads only safe correlation headers", () => {
    const headers = new Headers({
      "x-posthog-distinct-id": "ph-anon-1",
      "x-posthog-session-id": "session-1",
      "x-itt-operation-id": "op-1",
      "x-itt-question-index": "2",
      "x-itt-follow-up": "1",
      "x-itt-repeat": "0",
    });
    expect(readAnalyticsContext(headers, "fallback")).toMatchObject({
      distinctId: "ph-anon-1",
      sessionId: "session-1",
      operationId: "op-1",
      correlated: true,
    });
    expect(readQuestionContext(headers)).toEqual({ questionIndex: 2, followUp: true, isRepeat: false });
    expect(cleanAnalyticsId("person@example.com")).toBeNull();
    expect(readAnalyticsContext(new Headers(), "fallback-id").distinctId).toBe("srv_fallback-id");
  });

  it("counts one comparison as one outcome", () => {
    expect(classifyComparison({ controlOk: true, expertOk: true })).toBe("completed");
    expect(classifyComparison({ controlOk: true, expertOk: false })).toBe("partial");
    expect(classifyComparison({ error: "rate_limited" })).toBe("rate_limited");
    expect(operationSuccessful("partial")).toBe(true);
    expect(operationSuccessful("failed")).toBe(false);
    expect(sourceCoverage(0, true)).toBe("none");
    expect(sourceCoverage(2, true)).toBe("present");
  });

  it("classifies topics without storing the question", () => {
    expect(topicForQuestion("vik-proektant", "Какъв диаметър при дебит 2 l/s", null)).toBe("calculation");
    expect(topicForQuestion("ai-act-assistant", "Кои практики са забранени", "roles")).toBe("roles");
    expect(classifyTopic("ai-act-assistant", "санкции по регламента")).toBe("fines");
  });

  it("buckets pipe inputs and layer changes without keeping the full configuration", () => {
    expect(flowBucket(2)).toBe("1-5");
    expect(insulationBucket(30)).toBe("20-49");
    expect(deltaTBucket(15, 0)).toBe("5-20");
    expect(changedLayers({ roads: true, water: false }, { roads: false, water: false })).toEqual([
      { layer: "roads", enabled: false },
    ]);
  });

  it("prices a model only when both rates are configured", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, totalTokens: 2_000_000 };
    expect(estimateCostUsd("gpt-6.1-sol", usage, "")).toBeNull();
    expect(estimateCostUsd("gpt-6.1-sol", usage, JSON.stringify({ "gpt-6.1-sol": { inputPerMillionUsd: 2, outputPerMillionUsd: 8 } }))).toBe(10);
  });

  it("keeps campaign parameters and ignores other query values", () => {
    expect(readCampaign("?utm_source=conference&utm_campaign=summit-2026&email=person@example.com", null)).toEqual({
      utm_source: "conference",
      utm_campaign: "summit-2026",
    });
    const cookie = `itt_utm=${campaignCookieValue({ utm_source: "qr", utm_medium: "print" })}`;
    expect(readCampaign("", cookie)).toEqual({ utm_source: "qr", utm_medium: "print" });
    expect(readCampaign("?utm_source=talk", cookie).utm_source).toBe("talk");
  });

  it("names hub agents without treating the hub id as a visitor id", () => {
    expect(toolIdForAgent("ai-act")).toBe("ai-act-agent");
    expect(toolIdForAgent("vik-designer")).toBe("vik-designer");
    expect(toolIdForAgent("person@example.com")).toBe("agent-hub");
  });
});
