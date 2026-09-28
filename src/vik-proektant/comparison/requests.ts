import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { COMPARISON_MAX_OUTPUT_TOKENS, comparisonModel, expertMcpTool } from "./config";

export type ComparisonRequestBody = {
  model: string;
  store: false;
  max_output_tokens: number;
  instructions?: string;
  input: string;
  tools?: [ReturnType<typeof expertMcpTool>];
};

export function pluginRoot(cwd = process.cwd()): string {
  return path.join(cwd, "plugins/itt-digital-hub");
}

export function loadExpertInstructions(cwd = process.cwd()): string {
  const skillDir = path.join(pluginRoot(cwd), "skills/vik-projektant");
  const skill = readFileSync(path.join(skillDir, "SKILL.md"), "utf8").trim();
  const referenceDir = path.join(skillDir, "references");
  const references = readdirSync(referenceDir)
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "en"));
  const attached = references.map((name) => {
    const body = readFileSync(path.join(referenceDir, name), "utf8").trim();
    return `## Packaged reference: ${name}\n\n${body}`;
  });
  return [skill, ...attached].join("\n\n");
}

export function buildComparisonRequests(userPrompt: string, env: Record<string, string | undefined> = process.env, cwd = process.cwd()) {
  const model = comparisonModel(env);
  const shared = { model, store: false as const, max_output_tokens: COMPARISON_MAX_OUTPUT_TOKENS };
  const control: ComparisonRequestBody = { ...shared, input: userPrompt };
  const expert: ComparisonRequestBody = {
    ...shared,
    instructions: loadExpertInstructions(cwd),
    input: userPrompt,
    tools: [expertMcpTool(env)],
  };
  return { model, control, expert };
}
