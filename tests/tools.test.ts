import { describe, expect, it } from "vitest";
import { toolsFor } from "../src/content/tools";
import { toolsPage } from "../src/content/pages";
import { primaryNav } from "../src/content/site";

describe("tools catalogue", () => {
  it("places Tools immediately before About in primary nav", () => {
    const keys = primaryNav.map((item) => item.key);
    expect(keys.indexOf("tools")).toBe(keys.indexOf("people") - 1);
  });

  it("lists ViK, pipe thermal analysis, AI Act, then the settlement analyzer", () => {
    const ids = toolsFor("bg").map((tool) => tool.id);
    expect(ids).toEqual(["vik-proektant", "pipe-thermal-analysis", "ai-act-assistant", "settlement-analyzer"]);
    expect(toolsFor("bg")[0]?.href).toBe("/bg/vik-proektant");
    expect(toolsFor("bg")[0]?.status).toBeUndefined();
    expect(toolsFor("en")[0]?.href).toBe("/en/vik-proektant");
    expect(toolsFor("bg")[1]?.href).toBe("/bg/pipe-thermal-analysis");
    expect(toolsFor("en")[1]?.href).toBe("/en/pipe-thermal-analysis");
    expect(toolsFor("bg")[1]?.image).toBe("/tools/pipe-thermal-analysis-hero.jpg");
    expect(toolsFor("en")[1]?.image).toBe("/tools/pipe-thermal-analysis-hero.jpg");
    expect(toolsFor("bg")[2]?.href).toBe("/bg/ai-act");
    expect(toolsFor("en")[2]?.href).toBe("/en/ai-act");
    expect(toolsFor("bg")[2]?.image).toContain("ai-act-assistant-card-bg");
    expect(toolsFor("en")[2]?.image).toContain("ai-act-assistant-card-en");
    expect(toolsFor("bg")[3]?.href).toBe("/bg/settlement-analyzer");
    expect(toolsFor("en")[3]?.href).toBe("/en/settlement-analyzer");
    expect(toolsFor("bg")[3]?.image).toContain("settlement-analyzer-card-bg");
    expect(toolsFor("en")[3]?.image).toContain("settlement-analyzer-card-en");
    expect(toolsFor("en")[3]?.status).toBeUndefined();
    expect(toolsFor("bg").map((tool) => tool.id)).not.toContain("vik-designer");
    expect(toolsFor("en").some((tool) => tool.href?.includes("vik-designer"))).toBe(false);
  });

  it("does not point the analyzer card at an external site", () => {
    for (const locale of ["bg", "en"] as const) {
      const analyzer = toolsFor(locale).find((tool) => tool.id === "settlement-analyzer");
      expect(analyzer?.href).toBe(`/${locale}/settlement-analyzer`);
      expect(analyzer?.external).toBeUndefined();
      expect(JSON.stringify(analyzer)).not.toMatch(/analizator-naseleni-mesta/i);
    }
  });

  it("uses the specified document titles", () => {
    expect(toolsPage.meta.title.bg).toBe("Инструменти | ITT Digital Hub");
    expect(toolsPage.meta.title.en).toBe("Tools | ITT Digital Hub");
  });
});
