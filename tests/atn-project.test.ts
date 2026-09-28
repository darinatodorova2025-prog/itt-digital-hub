import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { projects } from "../src/content/projects";
import { home, projectsPage } from "../src/content/pages";
import { projectHeroVisuals, projectStoryVisuals, storyCovers } from "../src/content/stories";
import { projectToRecord } from "../src/lib/cms/serialize";
import { validateProjectPublish } from "../src/lib/cms/truth";

const dashPattern = /[\u2013\u2014]/;
const draftPattern =
  /TODO_VERIFY|TODO_ASSET|TODO_CONTENT|No fabricated results|Missing facts|Measured results|Status note|Conceptual prototype|in development|future roadmap/i;

function collectCopy(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectCopy);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectCopy);
  return [];
}

describe("public project stories", () => {
  it("uses the client-facing order without replacing slugs", () => {
    expect(projects.map((item) => item.slug)).toEqual([
      "atn-warranty-portal",
      "ai-assisted-solar-operations",
      "atn-creator-social-intelligence",
      "local-ai-orchestration",
    ]);
  });

  it("removes ATN from public titles and metadata", () => {
    for (const project of projects) {
      const blob = collectCopy({
        title: project.title,
        seo: project.seo,
        standfirst: project.standfirst,
        summary: project.summary,
      }).join("\n");
      expect(blob).not.toMatch(/\bATN\b/);
    }
    expect(projects[0]?.title.en).toBe("Warranty as a direct channel to the customer");
    expect(projects[2]?.title.en).toBe("From scattered campaigns to a traceable process");
  });

  it("keeps EN and BG story structure aligned", () => {
    for (const project of projects) {
      expect(project.tags.bg).toHaveLength(project.tags.en.length);
      expect(project.story.challenge.body.bg).toHaveLength(project.story.challenge.body.en.length);
      expect(project.story.built.body.bg).toHaveLength(project.story.built.body.en.length);
      expect(project.story.outcome.body.bg).toHaveLength(project.story.outcome.body.en.length);
      if (project.story.howItWorks) {
        expect(project.story.howItWorks.body.bg).toHaveLength(project.story.howItWorks.body.en.length);
      }
      if (project.story.value) {
        expect(project.story.value.body.bg).toHaveLength(project.story.value.body.en.length);
        if (project.story.value.items) {
          expect(project.story.value.items.bg).toHaveLength(project.story.value.items.en.length);
        }
      }
      for (const extra of project.story.extras ?? []) {
        expect(extra.body.bg).toHaveLength(extra.body.en.length);
        if (extra.items) expect(extra.items.bg).toHaveLength(extra.items.en.length);
      }
    }
  });

  it("omits drafting language, empty measured-results copy and long dashes", () => {
    const publicCopy = [
      ...projects.flatMap((project) => collectCopy(project)),
      ...collectCopy(home.featured),
      ...collectCopy({ meta: projectsPage.meta, heading: projectsPage.heading, lead: projectsPage.lead }),
    ];
    for (const text of publicCopy) {
      expect(text).not.toMatch(dashPattern);
      expect(text).not.toMatch(draftPattern);
    }
  });

  it("keeps the confirmed proof points without inventing extra metrics", () => {
    const solar = projects.find((item) => item.slug === "ai-assisted-solar-operations");
    const orchestration = projects.find((item) => item.slug === "local-ai-orchestration");
    expect(solar?.proofPoint?.en).toMatch(/more than 30 solar parks/i);
    expect(orchestration?.proofPoint).toBeUndefined();
    expect(collectCopy(orchestration).join("\n")).not.toMatch(/60-80%/);
    for (const project of projects) {
      expect(project.measuredResults).toBeUndefined();
      expect(validateProjectPublish(projectToRecord(project)).filter((issue) => issue.blocking)).toHaveLength(0);
    }
  });

  it("tells the local-first orchestration story without internal names or model-router framing", () => {
    const orchestration = projects.find((item) => item.slug === "local-ai-orchestration");
    expect(orchestration).toBeDefined();
    const blob = collectCopy(orchestration).join("\n");
    expect(orchestration?.title.en).toBe("Local AI orchestration");
    expect(orchestration?.title.bg).toBe("Локална ИИ оркестрация");
    expect(orchestration?.seo?.documentTitle.en).toBe("Local AI orchestration | ITT Digital Hub");
    expect(orchestration?.seo?.documentTitle.bg).toBe("Локална ИИ оркестрация | ITT Digital Hub");
    expect(orchestration?.tags.en).toEqual(["Local models", "Cloud models", "Orchestration", "Control", "Tools"]);
    expect(blob).not.toMatch(/tCode/i);
    expect(blob).not.toMatch(/Task Captain/i);
    expect(blob).not.toMatch(/AI harness/i);
    expect(blob).not.toMatch(/prototype/i);
    expect(blob).not.toMatch(/Internal R&D/);
    expect(blob).not.toMatch(/TODO_/);
    expect(blob).toMatch(/MCP provides controlled access/);
    expect(blob).toMatch(/MCP осигурява контролиран достъп/);
    expect(blob).toMatch(/orchestration layer remains responsible for execution/i);
    expect(blob).toMatch(/Оркестрационният слой остава отговорен за изпълнението/);
    expect(blob).toMatch(/A simple routing system chooses a model/);
    expect(blob).not.toMatch(/never leaves|completely secure|guaranteed|zero risk/i);
    expect(blob).toMatch(/task-level cloud-token usage/);
    expect(blob).not.toMatch(/MCP is the orchestrat/i);
    expect(blob).not.toMatch(/MCP оркестрира/i);
  });

  it("uses non-confidential cover assets", () => {
    expect(storyCovers["atn-warranty-portal"]?.kind).toBe("photo");
    expect(storyCovers["local-ai-orchestration"]?.kind).toBe("diagram");
    expect(storyCovers["atn-creator-social-intelligence"]?.kind).toBe("photo");
    expect(storyCovers["ai-assisted-solar-operations"]?.kind).toBe("photo");

    const warrantyVisuals = projectStoryVisuals["atn-warranty-portal"];
    const files = [
      "/stories/warranty-journey.jpg",
      "/stories/warranty-relationship.jpg",
      "/stories/warranty-verification.jpg",
      "/stories/warranty-exceptions.jpg",
      "/stories/warranty-intelligence.jpg",
      "/stories/creator-content-library.jpg",
      "/stories/creator-profile.jpg",
      "/stories/creator-content-performance.jpg",
      "/stories/creator-analytics.jpg",
      "/stories/solar-batteries-cover.jpg",
      "/stories/local-orchestration-cover.webp",
    ];
    for (const src of files) {
      expect(existsSync(resolve(`public${src}`))).toBe(true);
    }
    expect(projects[0]?.seo?.image).toBe("/stories/warranty-journey.jpg");
    expect(projectHeroVisuals["atn-warranty-portal"]?.src).toBe("/stories/warranty-relationship.jpg");
    expect(warrantyVisuals?.built?.src).toBe("/stories/warranty-verification.jpg");
    expect(warrantyVisuals?.how?.src).toBe("/stories/warranty-exceptions.jpg");
    expect(warrantyVisuals?.value?.src).toBe("/stories/warranty-intelligence.jpg");
    expect(warrantyVisuals?.value?.caption?.en).toMatch(/sample data/i);
    expect(warrantyVisuals?.value?.caption?.bg).toMatch(/примерни данни/i);
    const creatorVisuals = projectStoryVisuals["atn-creator-social-intelligence"];
    expect(projects[2]?.seo?.image).toBe("/stories/creator-content-library.jpg");
    expect(projectHeroVisuals["atn-creator-social-intelligence"]?.src).toBe("/stories/creator-profile.jpg");
    expect(creatorVisuals?.built?.src).toBe("/stories/creator-content-performance.jpg");
    expect(creatorVisuals?.value?.src).toBe("/stories/creator-analytics.jpg");
    expect(creatorVisuals?.value?.caption?.en).toMatch(/sample data/i);
    expect(creatorVisuals?.value?.caption?.bg).toMatch(/примерни данни/i);
    expect(projects[1]?.seo?.image).toBe("/stories/solar-batteries-cover.jpg");
    expect(projects[3]?.seo?.image).toBe("/stories/local-orchestration-cover.webp");
  });
});
