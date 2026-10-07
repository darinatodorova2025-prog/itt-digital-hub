import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { href } from "../../src/lib/paths";
import { toolsFor } from "../../src/content/tools";
import { isNavItemActive } from "../../src/lib/home-nav";

describe("itt digital hub plugin package", () => {
  const root = "plugins/itt-digital-hub";
  const portable = JSON.parse(readFileSync(`${root}/plugin.json`, "utf8")) as {
    $schema: string;
    name: string;
    description: string;
    extensions: { "com.openai": { interface: { displayName: string; shortDescription: string; privacyPolicyURL: string } } };
  };
  const codex = JSON.parse(readFileSync(`${root}/.codex-plugin/plugin.json`, "utf8")) as {
    name: string;
    description: string;
    skills: string;
    mcpServers: string;
    interface: { displayName: string; shortDescription: string };
  };
  const mcp = JSON.parse(readFileSync(`${root}/mcp.json`, "utf8")) as { $schema: string; mcpServers: { vik: { type: string; url: string } } };
  const legacyMcp = JSON.parse(readFileSync(`${root}/.mcp.json`, "utf8")) as { mcpServers: { vik: { type: string; url: string } } };
  const skill = readFileSync(`${root}/skills/vik-projektant/SKILL.md`, "utf8");

  it("uses the portable manifest and the Codex compatibility manifest together", () => {
    expect(portable.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    expect(portable.name).toBe("itt-digital-hub");
    expect(codex.name).toBe(portable.name);
    expect(codex.description).toBe(portable.description);
    expect(codex.skills).toBe("./skills/");
    expect(codex.mcpServers).toBe("./.mcp.json");
    expect(portable.extensions["com.openai"].interface.displayName).toBe("ITT Digital Hub");
    expect(codex.interface.displayName).toBe("ITT Digital Hub");
    expect(codex.interface.shortDescription.length).toBeLessThanOrEqual(30);
    expect(portable.extensions["com.openai"].interface.privacyPolicyURL).toBe("https://ittdigitalhub.org/bg/privacy");
    expect(JSON.stringify(portable)).not.toContain("termsOfServiceURL");
  });

  it("points both MCP manifests at the same HTTPS endpoint", () => {
    expect(mcp.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
    expect(mcp.mcpServers.vik.type).toBe("streamable-http");
    expect(legacyMcp.mcpServers.vik.type).toBe("http");
    expect(mcp.mcpServers.vik.url).toBe(legacyMcp.mcpServers.vik.url);
    expect(mcp.mcpServers.vik.url).toBe("https://ittdigitalhub.org/api/mcp/vik");
  });

  it("ships the ViK skill without secrets or the full corpus", () => {
    expect(skill).toContain("name: vik-projektant");
    expect(skill).toContain("search_vik_knowledge");
    expect(skill).toContain("Имам 20 къщи");
    expect(skill).not.toMatch(/sk-|api[_-]?key|BEGIN PRIVATE/i);
    expect(skill.length).toBeLessThan(20_000);
  });
});

describe("vik proektant site wiring", () => {
  it("lists V2 in the catalogue and keeps V1 off the public site", () => {
    expect(href("bg", "vik-proektant")).toBe("/bg/vik-proektant");
    expect(href("en", "vik-proektant", "compare")).toBe("/en/vik-proektant/compare");
    expect(toolsFor("bg").map((tool) => tool.id)).not.toContain("vik-designer");
    expect(toolsFor("bg")[0]?.id).toBe("vik-proektant");
    expect(toolsFor("bg")[0]?.image).toBe("/tools/vik-proektant-card.jpg");
    expect(toolsFor("en")[0]?.image).toBe("/tools/vik-proektant-card.jpg");
    expect(toolsFor("en")[0]?.href).toBe("/en/vik-proektant/compare");
    expect(isNavItemActive("/bg/vik-proektant/compare", "tools", "/bg/tools")).toBe(true);
    expect(isNavItemActive("/bg/vik-designer", "tools", "/bg/tools")).toBe(true);
  });
});
