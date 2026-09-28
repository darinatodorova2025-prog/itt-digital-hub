import { describe, expect, it } from "vitest";
import { assertJuryCompleteForResults, summarizeJuryProgress } from "@/mahni-dosadnoto/jury-status";
import { isTransientAiError } from "@/mahni-dosadnoto/ai/transient-errors";
import { AiActProviderError } from "@/lib/ai-act/errors";

describe("jury progress", () => {
  it("requires three succeeded judges before results", () => {
    const partial = summarizeJuryProgress([
      { judgeType: "business_value", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "feasibility", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "innovation", status: "failed", errorCode: "rate_limited", errorMessage: "429" },
    ]);
    expect(partial.succeeded).toBe(2);
    expect(partial.complete).toBe(false);
    expect(() => assertJuryCompleteForResults(partial)).toThrow(/jury_incomplete/);
  });

  it("marks complete when all judges succeeded", () => {
    const done = summarizeJuryProgress([
      { judgeType: "business_value", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "feasibility", status: "succeeded", errorCode: null, errorMessage: null },
      { judgeType: "innovation", status: "succeeded", errorCode: null, errorMessage: null },
    ]);
    expect(done.complete).toBe(true);
    expect(() => assertJuryCompleteForResults(done)).not.toThrow();
  });
});

describe("transient AI errors", () => {
  it("treats provider rate limits as transient", () => {
    expect(isTransientAiError(new AiActProviderError("rate_limited", "429"))).toBe(true);
    expect(isTransientAiError(new Error("Request timed out"))).toBe(true);
    expect(isTransientAiError(new Error("validation failed"))).toBe(false);
  });
});
