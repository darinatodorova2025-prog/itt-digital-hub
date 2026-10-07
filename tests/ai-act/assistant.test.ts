import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aiAct, comparisonExamples } from "../../src/content/ai-act";
import { articleMention, getArticle, searchKnowledge } from "../../src/ai-act/engine/search";
import { callTool } from "../../src/ai-act/engine/tools";
import { collectExecution, expertStatusLine } from "../../src/ai-act/comparison/presentation";
import { CONTROL_INSTRUCTIONS, comparisonModel } from "../../src/ai-act/comparison/config";
import { buildComparisonRequests, loadExpertInstructions } from "../../src/ai-act/comparison/requests";
import { runComparison } from "../../src/ai-act/comparison/run";
import { POST as comparePost } from "../../src/app/api/ai-act/compare/route";
import { resetRateLimits } from "../../src/vik-proektant/comparison/limits";
import { href } from "../../src/lib/paths";
import { toolsFor } from "../../src/content/tools";

const prompt = (id: (typeof comparisonExamples)[number]["id"], locale: "bg" | "en" = "bg") =>
  comparisonExamples.find((example) => example.id === id)?.prompt[locale] ?? "";

describe("AI Act retrieval scenarios", () => {
  it("does not provide a classifier tool", () => {
    expect(callTool("classify_ai_system", {})).toMatchObject({ ok: false });
    expect(loadExpertInstructions(process.cwd(), "2026-09-26")).toContain("Do not overclassify");
  });

  it("fetches Article 4 in the official Bulgarian text", () => {
    const article = getArticle("4");
    expect(article.ok).toBe(true);
    if (!article.ok) return;
    const references = article.data.references as Array<{ text: string; kind: string }>;
    const law = references.filter((item) => item.kind === "law").map((item) => item.text).join("\n");
    expect(law).toContain("грамотността в областта на ИИ");
    expect(law).toContain("не налага");
    expect(articleMention(prompt("article-4"))).toBe("4");
  });

  it("returns provider and deployer definitions for the role question", () => {
    const found = searchKnowledge({ query: prompt("roles") });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.results.some((hit) => hit.article === "3" || hit.kind === "engineering")).toBe(true);
    const article = getArticle("3");
    expect(article.ok).toBe(true);
    if (!article.ok) return;
    const text = JSON.stringify(article.data);
    expect(text).toContain("„доставчик“");
    expect(text).toContain("„внедрител“");
    expect(text).toContain("„вносител“");
    expect(text).toContain("„упълномощен представител“");
  });

  it("retrieves Annex III employment wording for candidate screening", () => {
    const found = searchKnowledge({ query: "Проектантска фирма използва ИИ за предварителен подбор на кандидати." });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.results.some((hit) => hit.annex === "III" && hit.excerpt.includes("подбор"))).toBe(true);
  });

  it("retrieves Article 113 dates from the Bulgarian consolidated text", () => {
    const found = searchKnowledge({ query: "Кои задължения вече се прилагат и кои влизат в сила по-късно?" });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const article = getArticle("113");
    expect(article.ok).toBe(true);
    if (!article.ok) return;
    const text = JSON.stringify(article.data);
    expect(text).toContain("2 август 2026");
    expect(text).toContain("2 февруари 2025");
  });

  it("does not fabricate Article 999", () => {
    expect(searchKnowledge({ query: "What does Article 999 require?" })).toMatchObject({ ok: true, results: [] });
    const article = getArticle("999");
    expect(article.ok && article.data.found).toBe(false);
    expect(JSON.stringify(article)).not.toMatch(/mandatory registration of every chatbot/i);
  });

  it("keeps the open use-case path free of a deterministic classifier", () => {
    expect(prompt("open-case").length).toBeGreaterThan(10);
    const names = ["search_ai_act_knowledge", "get_ai_act_article", "get_ai_act_annex", "get_ai_act_reference", "list_ai_act_sources"];
    const tools = readFileSync("src/ai-act/engine/tools.ts", "utf8");
    for (const name of names) expect(tools).toContain(name);
    expect(tools).not.toMatch(/openai|anthropic|generateText|chat\.completions/i);
    expect(loadExpertInstructions()).toContain("what the system does");
  });
});

describe("AI Act provenance", () => {
  it("counts a fetched article as one used source and ignores search candidates", () => {
    const search = callTool("search_ai_act_knowledge", { query: "Article 4 AI literacy", limit: 5 });
    const article = callTool("get_ai_act_article", { article: "4" });
    expect(search.ok && article.ok).toBe(true);
    if (!search.ok || !article.ok) return;
    const searchData = search.data as { resultCount: number; citations: boolean };
    expect(searchData.citations).toBe(false);
    expect(searchData.resultCount).toBeGreaterThan(0);
    const execution = collectExecution([
      { name: "search_ai_act_knowledge", output: JSON.stringify(search.data) },
      { name: "get_ai_act_article", output: JSON.stringify(article.data) },
    ]);
    expect(execution.retrievalCount).toBe(1);
    expect(execution.sources).toHaveLength(1);
    expect(execution.sources[0]?.article).toBe("4");
    expect(execution.sources[0]?.url.startsWith("https://")).toBe(true);
    expect(JSON.stringify(execution.sources)).not.toContain("referenceId");
    expect(expertStatusLine("bg", execution.sources.length, true)).toBe("1 използван източник · Търсене в специализираната база");
    expect(expertStatusLine("en", execution.sources.length, true)).toBe("1 source used · Search in the specialized collection");
  });

  it("does not invent a source list when search returns nothing", () => {
    const search = callTool("search_ai_act_knowledge", { query: "What does Article 999 require?" });
    expect(search.ok).toBe(true);
    if (!search.ok) return;
    const execution = collectExecution([{ name: "search_ai_act_knowledge", output: JSON.stringify(search.data) }]);
    expect(execution.retrievalCount).toBe(1);
    expect(execution.sources).toEqual([]);
    expect(expertStatusLine("bg", 0, true)).toBe("Търсене в специализираната база");
    expect(expertStatusLine("en", 0, true)).not.toMatch(/source/i);
  });

  it("keeps five search candidates from becoming five used sources", () => {
    const hits = Array.from({ length: 5 }, (_, index) => ({
      title: `Candidate ${index}`,
      article: String(index + 1),
      kind: "law",
      url: "https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27",
    }));
    const execution = collectExecution([
      { name: "search_ai_act_knowledge", output: JSON.stringify({ results: hits, resultCount: 5, citations: false }) },
      {
        name: "get_ai_act_reference",
        output: JSON.stringify({
          reference: {
            title: "Regulation (EU) 2024/1689, Articles 3(56) and 4 (extract)",
            article: "4",
            heading: "Article 4",
            kind: "law",
            authority: "eur-lex",
            version: "consolidated 27 July 2026",
            url: "https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27",
            text: "Providers and deployers of AI systems shall take measures.",
          },
        }),
      },
    ]);
    expect(execution.retrievalCount).toBe(1);
    expect(execution.sources).toHaveLength(1);
    expect(execution.sources[0]?.article).toBe("4");
    expect(expertStatusLine("bg", execution.sources.length, true)).toContain("1 използван източник");
  });

  it("collapses duplicate chunks of the same article into one source", () => {
    const article = callTool("get_ai_act_article", { article: "4" });
    expect(article.ok).toBe(true);
    if (!article.ok) return;
    const data = article.data as { references: unknown[] };
    const execution = collectExecution([
      { name: "get_ai_act_article", output: JSON.stringify({ ...data, references: [...data.references, ...data.references] }) },
    ]);
    expect(execution.sources).toHaveLength(1);
  });
});

describe("AI Act comparison fairness", () => {
  const env = { AI_ACT_COMPARISON_MODEL: "gpt-5.6", OPENAI_API_KEY: "test-key", NEXT_PUBLIC_SITE_URL: "https://ittdigitalhub.org" };
  const question = prompt("article-4");
  const requests = buildComparisonRequests(question, env, process.cwd(), "2026-09-26");

  it("sends the same model and the same user prompt", () => {
    expect(requests.control.model).toBe(requests.expert.model);
    expect(requests.control.model).toBe(comparisonModel(env));
    expect(requests.control.input).toBe(question);
    expect(requests.expert.input).toBe(question);
    expect(requests.control.max_output_tokens).toBe(requests.expert.max_output_tokens);
    expect(requests.control.store).toBe(false);
    expect(requests.expert.store).toBe(false);
    expect(requests.control).not.toHaveProperty("tools");
    expect(requests.control.instructions).toBe(CONTROL_INSTRUCTIONS);
  });

  it("keeps the skill, retrieval and tools off the control path", () => {
    const control = JSON.stringify(requests.control);
    expect(control).not.toContain("search_ai_act_knowledge");
    expect(control).not.toContain("get_ai_act_article");
    expect(control).not.toContain("/api/mcp/ai-act");
    expect(control).not.toContain("AI Act Assistant");
    expect(requests.expert.tools?.[0]?.server_url).toBe("https://ittdigitalhub.org/api/mcp/ai-act");
    expect(requests.expert.tools?.[0]?.allowed_tools).toEqual([
      "search_ai_act_knowledge",
      "get_ai_act_article",
      "get_ai_act_annex",
      "get_ai_act_reference",
      "list_ai_act_sources",
    ]);
    expect(requests.expert.instructions).toContain("name: ai-act-assistant");
    expect(requests.expert.instructions).not.toContain("shall take measures to support the development of AI literacy");
    expect(requests.expert.instructions).toContain("2026-09-26");
  });

  it("hides expert metadata from the public control payload and keeps a failed side independent", async () => {
    const result = await runComparison(question, {
      env,
      today: "2026-09-26",
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown; input: string };
        expect(body.input).toBe(question);
        expect(body.model).toBe("gpt-5.6");
        if (body.tools) {
          return Response.json({
            model: body.model,
            output_text: "expert",
            output: [{ type: "mcp_call", name: "get_ai_act_article", output: JSON.stringify((callTool("get_ai_act_article", { article: "4" }) as { data: unknown }).data) }],
          });
        }
        return Response.json({ model: body.model, output_text: "control answer" });
      },
    });
    expect(result.fair).toBe(true);
    expect(result.control.ok && result.control.text).toBe("control answer");
    if (result.control.ok) expect(result.control.toolNames).toEqual([]);
    expect(result.expert.ok && result.expert.sources).toHaveLength(1);

    const previousKey = process.env.OPENAI_API_KEY;
    const previousModel = process.env.AI_ACT_COMPARISON_MODEL;
    const previousSite = process.env.NEXT_PUBLIC_SITE_URL;
    const originalFetch = globalThis.fetch;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_ACT_COMPARISON_MODEL = "gpt-5.6";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ittdigitalhub.org";
    resetRateLimits();
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.includes("api.openai.com")) return originalFetch(input, init);
      const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown };
      if (body.tools) {
        return Response.json({
          model: body.model,
          output_text: "expert",
          output: [{ type: "mcp_call", name: "get_ai_act_article", output: JSON.stringify((callTool("get_ai_act_article", { article: "4" }) as { data: unknown }).data) }],
        });
      }
      return Response.json({ model: body.model, output_text: "control answer" });
    }) as typeof fetch;
    try {
      const response = await comparePost(new Request("https://ittdigitalhub.org/api/ai-act/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, locale: "bg", exampleId: "article-4" }),
      }));
      const payload = (await response.json()) as { control: Record<string, unknown>; expert: { sources?: unknown[] } };
      expect(response.status).toBe(200);
      expect(payload.control).toEqual({ ok: true, text: "control answer" });
      expect(payload.expert.sources).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousKey;
      if (previousModel === undefined) delete process.env.AI_ACT_COMPARISON_MODEL;
      else process.env.AI_ACT_COMPARISON_MODEL = previousModel;
      if (previousSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previousSite;
    }

    const partial = await runComparison(question, {
      env,
      today: "2026-09-26",
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { tools?: unknown; model: string };
        if (body.tools) return new Response("no", { status: 503 });
        return Response.json({ model: body.model, output_text: "still here" });
      },
    });
    expect(partial.control.ok).toBe(true);
    expect(partial.expert.ok).toBe(false);
    if (!partial.expert.ok) expect(partial.expert.error).toBe("upstream");
  });
});

describe("AI Act public routing", () => {
  it("publishes V2 and leaves the legacy route in the repository", () => {
    expect(href("bg", "ai-act")).toBe("/bg/ai-act");
    expect(href("en", "ai-act")).toBe("/en/ai-act");
    expect(href("bg", "ai-act", "compare")).toBe("/bg/ai-act/compare");
    expect(href("en", "ai-act", "compare")).toBe("/en/ai-act/compare");
    expect(href("bg", "ai-act")).not.toContain("v2");
    expect(toolsFor("bg").find((tool) => tool.id === "ai-act-assistant")?.href).toBe("/bg/ai-act/compare");
    expect(toolsFor("en").find((tool) => tool.id === "ai-act-assistant")?.href).toBe("/en/ai-act/compare");
    expect(toolsFor("bg").filter((tool) => tool.href?.includes("ai-act"))).toHaveLength(1);
    expect(readFileSync("src/app/[locale]/ai-act-agent/page.tsx", "utf8")).toContain("EntryExperience");
    expect(readFileSync("src/app/sitemap.ts", "utf8")).not.toContain("ai-act-agent");
    expect(readFileSync("src/app/robots.ts", "utf8")).toContain("/bg/ai-act-agent");
    expect(aiAct.compare.submit.en).toBe("Compare responses");
    expect(aiAct.compare.submit.bg).toBe("Сравни отговорите");
  });
});
