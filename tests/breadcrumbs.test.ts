import { describe, expect, it } from "vitest";
import { breadcrumbTrail, parentCrumb, projectCrumbLabel } from "../src/lib/breadcrumbs";

describe("breadcrumb trails", () => {
  it("builds the ViK product under Tools without linking the current page", () => {
    const trail = breadcrumbTrail("bg", "vik");
    expect(trail.map((item) => item.label)).toEqual(["Начало", "Инструменти", "ВиК Проектант"]);
    expect(trail[0]?.href).toBe("/bg");
    expect(trail[1]?.href).toBe("/bg/tools");
    expect(trail[2]?.href).toBeUndefined();
    expect(parentCrumb("bg", "vik")).toEqual({ label: "Инструменти", href: "/bg/tools" });
  });

  it("uses native English names rather than URL slugs", () => {
    const trail = breadcrumbTrail("en", "vik");
    expect(trail.map((item) => item.label)).toEqual(["Home", "Tools", "Water & Sewerage Designer"]);
    expect(trail.map((item) => item.label).join(" ")).not.toMatch(/vik-proektant|compare/);
  });

  it("places tools, the analyzer, AI Act and pipe thermal analysis under Tools", () => {
    expect(breadcrumbTrail("bg", "settlement").map((item) => item.label)).toEqual([
      "Начало",
      "Инструменти",
      "Анализатор на населени места",
    ]);
    expect(breadcrumbTrail("en", "ai-act").map((item) => item.label)).toEqual(["Home", "Tools", "AI Act Assistant"]);
    expect(breadcrumbTrail("bg", "ai-act").at(-1)?.href).toBeUndefined();
    expect(breadcrumbTrail("bg", "ai-act-compare")[2]?.href).toBe("/bg/ai-act/compare");
    expect(breadcrumbTrail("en", "pipe").map((item) => item.label)).toEqual(["Home", "Tools", "Pipe Thermal Analysis"]);
    expect(breadcrumbTrail("bg", "settlement-privacy").map((item) => item.label)).toEqual([
      "Начало",
      "Инструменти",
      "Анализатор на населени места",
      "Поверителност",
    ]);
  });

  it("names a project from a short label, not its slug", () => {
    const label = projectCrumbLabel("bg", "atn-warranty-portal", "Гаранцията като директен канал към клиента");
    const trail = breadcrumbTrail("bg", "project", label);
    expect(trail.map((item) => item.label)).toEqual(["Начало", "Работа", "Гаранционна платформа"]);
    expect(trail[1]?.href).toBe("/bg/projects");
    expect(trail[2]?.href).toBeUndefined();
    expect(projectCrumbLabel("en", "unknown-slug", "Published title")).toBe("Published title");
  });
});
