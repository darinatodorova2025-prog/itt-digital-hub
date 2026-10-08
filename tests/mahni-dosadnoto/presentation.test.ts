import { describe, expect, it } from "vitest";
import { lensVisual, sharedPriorityBody, sharedPriorityHeadline, storyForPhase } from "@/mahni-dosadnoto/presentation";

describe("mahni presentation narrative", () => {
  it("names shared priorities without a contest", () => {
    expect(sharedPriorityHeadline(1)).toBe("Един общ приоритет");
    expect(sharedPriorityHeadline(2)).toBe("Два общи приоритета");
    expect(sharedPriorityHeadline(3)).toBe("Три общи приоритета");
    expect(sharedPriorityHeadline(0)).toBeNull();
    expect(sharedPriorityBody(1)).toContain("избора на участниците");
    expect(sharedPriorityBody(2)).toContain("независимия анализ");
  });

  it("maps internal phases onto the five-stage story", () => {
    expect(storyForPhase("COLLECTING")?.n).toBe(1);
    expect(storyForPhase("ANALYZING")?.label).toBe("Подреждаме");
    expect(storyForPhase("FINALIZING")?.label).toBe("Гласуваме");
    expect(storyForPhase("AI_JURY")?.n).toBe(4);
    expect(storyForPhase("RESULTS")?.rail).toBe("Резултат");
    expect(storyForPhase("DRAFT")).toBeNull();
  });

  it("keeps a failed lens visually active without exposing the failure", () => {
    const lenses = [{ status: "succeeded" }, { status: "failed" }, { status: "missing" }];
    expect(lensVisual("succeeded", 0, lenses)).toBe("done");
    expect(lensVisual("failed", 1, lenses)).toBe("active");
    expect(lensVisual("missing", 2, lenses)).toBe("wait");
  });
});
