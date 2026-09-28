import { describe, expect, it } from "vitest";
import { primaryNav } from "../src/content/site";
import { href } from "../src/lib/paths";
import {
  homeHashHref,
  homeNavHash,
  homeSpyNavProgression,
  homeSpySectionIds,
  isActivePath,
  isHomePath,
  isHomeSectionHash,
  isNavItemActive,
  navKeyForHomeSection,
  primaryNavHref,
} from "../src/lib/home-nav";

describe("home path", () => {
  it("treats locale roots as the landing page", () => {
    expect(isHomePath("/bg")).toBe(true);
    expect(isHomePath("/en")).toBe(true);
    expect(isHomePath("/en/")).toBe(true);
    expect(isHomePath("/bg/methodology")).toBe(false);
    expect(isHomePath("/bg/projects/x")).toBe(false);
  });

  it("recognises leftover landing hashes that would skip the hero", () => {
    expect(isHomeSectionHash("#work")).toBe(true);
    expect(isHomeSectionHash("work")).toBe(true);
    expect(isHomeSectionHash("#contact")).toBe(true);
    expect(isHomeSectionHash("#executive")).toBe(false);
  });
});

describe("homepage section map", () => {
  it("keeps primary nav in the Summit one-page order, with Tools before About", () => {
    expect(primaryNav.map((item) => item.key)).toEqual([
      "projects",
      "about",
      "methodology",
      "tools",
      "people",
      "work-with-us",
    ]);
  });

  it("maps landing blocks onto primary nav keys", () => {
    expect(navKeyForHomeSection("experience")).toBe("projects");
    expect(navKeyForHomeSection("work")).toBe("projects");
    expect(navKeyForHomeSection("problems")).toBe("about");
    expect(navKeyForHomeSection("judgement")).toBe("about");
    expect(navKeyForHomeSection("approach")).toBe("methodology");
    expect(navKeyForHomeSection("people")).toBe("people");
    expect(navKeyForHomeSection("contact")).toBe("work-with-us");
    expect(navKeyForHomeSection("insights")).toBe(null);
    expect(navKeyForHomeSection("missing")).toBe(null);
  });

  it("keeps spy ids in homepage document order", () => {
    expect([...homeSpySectionIds]).toEqual(["experience", "work", "problems", "judgement", "benefit", "approach", "people", "contact"]);
  });

  it("aligns homepage-mapped nav order with document-order spy progression", () => {
    const spyOrder = homeSpyNavProgression();
    expect(spyOrder).toEqual(["projects", "about", "methodology", "people", "work-with-us"]);

    const navHomeOrder = primaryNav
      .map((item) => item.key)
      .filter((key): key is Exclude<typeof key, "home" | "privacy"> => key !== "home" && key !== "privacy" && Boolean(homeNavHash[key]));
    expect(navHomeOrder).toEqual(spyOrder);
  });

  it("does not put news or insights in the public nav", () => {
    expect(primaryNav.some((item) => item.key === "insights")).toBe(false);
    expect(primaryNav.some((item) => item.key === "news")).toBe(false);
    expect(homeNavHash.insights).toBeUndefined();
    expect(homeHashHref("bg", "insights")).toBe(null);
    expect(href("bg", "insights")).toBe("/bg/insights");
  });

  it("keeps Tools as its own route instead of a homepage hash", () => {
    expect(homeNavHash.tools).toBeUndefined();
    expect(homeHashHref("bg", "tools")).toBe(null);
    expect(homeHashHref("en", "tools")).toBe(null);
    expect(href("bg", "tools")).toBe("/bg/tools");
    expect(href("en", "tools")).toBe("/en/tools");
  });

  it("builds in-page hashes for the landing nav", () => {
    expect(homeHashHref("bg", "methodology")).toBe("/bg#approach");
    expect(homeHashHref("en", "projects")).toBe("/en#work");
    expect(homeHashHref("en", "about")).toBe("/en#problems");
    expect(homeHashHref("bg", "privacy")).toBe(null);
  });

  it("keeps landing sections on the homepage from every route, including Tools", () => {
    expect(primaryNavHref("bg", "projects")).toBe("/bg#work");
    expect(primaryNavHref("bg", "people")).toBe("/bg#people");
    expect(primaryNavHref("en", "about")).toBe("/en#problems");
    expect(primaryNavHref("bg", "work-with-us")).toBe("/bg#contact");
    expect(primaryNavHref("bg", "tools")).toBe("/bg/tools");
    expect(primaryNavHref("en", "privacy")).toBe("/en/privacy");
  });
});

describe("path-based current item", () => {
  it("marks a section from nested paths", () => {
    expect(isActivePath("/bg/projects/pilot", "/bg/projects")).toBe(true);
    expect(isActivePath("/bg/methodology", "/bg/projects")).toBe(false);
  });

  it("keeps Tools current on every product surface", () => {
    expect(isNavItemActive("/bg/tools", "tools", "/bg/tools")).toBe(true);
    expect(isNavItemActive("/bg/ai-act-agent", "tools", "/bg/tools")).toBe(true);
    expect(isNavItemActive("/bg/ai-act-agent/build", "tools", "/bg/tools")).toBe(true);
    expect(isNavItemActive("/en/settlement-analyzer", "tools", "/en/tools")).toBe(true);
    expect(isNavItemActive("/bg/pipe-thermal-analysis", "tools", "/bg/tools")).toBe(true);
    expect(isNavItemActive("/en/pipe-thermal-analysis", "tools", "/en/tools")).toBe(true);
    expect(isNavItemActive("/bg/vik-designer", "tools", "/bg/tools")).toBe(true);
    expect(isNavItemActive("/bg/projects", "tools", "/bg/tools")).toBe(false);
  });
});
