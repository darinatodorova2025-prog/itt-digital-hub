import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { comparisonExamples } from "../../src/content/vik-proektant";
import { comparisonModel } from "../../src/vik-proektant/comparison/config";
import { buildComparisonRequests, loadExpertInstructions } from "../../src/vik-proektant/comparison/requests";
import { runComparison } from "../../src/vik-proektant/comparison/run";
import { chatGptDestination } from "../../src/vik-proektant/publication";
import { POST as comparePost } from "../../src/app/api/vik-proektant/compare/route";
import { resetRateLimits, takeToken } from "../../src/vik-proektant/comparison/limits";
import { COMPARE_LIMIT, COMPARE_WINDOW_MS } from "../../src/app/api/vik-proektant/compare/route";

const env = { VIK_COMPARISON_MODEL: "gpt-5.6", OPENAI_API_KEY: "test-key", NEXT_PUBLIC_SITE_URL: "https://ittdigitalhub.org" };

describe("comparison fairness", () => {
  const prompt = "Имам 20 къщи. Каква тръба да сложа?";
  const requests = buildComparisonRequests(prompt, env);

  it("sends the same model and the same user prompt", () => {
    expect(requests.control.model).toBe(requests.expert.model);
    expect(requests.control.model).toBe(comparisonModel(env));
    expect(requests.control.input).toBe(prompt);
    expect(requests.expert.input).toBe(prompt);
    expect(requests.control.max_output_tokens).toBe(requests.expert.max_output_tokens);
    expect(requests.control.store).toBe(false);
    expect(requests.expert.store).toBe(false);
    expect(requests.control).not.toHaveProperty("temperature");
    expect(requests.expert).not.toHaveProperty("temperature");
    expect(requests.control).not.toHaveProperty("tools");
    expect(requests.control).not.toHaveProperty("instructions");
  });

  it("keeps ViK tools and the skill off the control path", () => {
    const control = JSON.stringify(requests.control);
    const expert = JSON.stringify(requests.expert);
    expect(control).not.toContain("search_vik_knowledge");
    expect(control).not.toContain("calculate_pipe_diameter");
    expect(control).not.toContain("/api/mcp/vik");
    expect(control).not.toContain("instructions");
    expect(expert).toContain("search_vik_knowledge");
    expect(requests.expert.tools?.[0]?.server_url).toBe("https://ittdigitalhub.org/api/mcp/vik");
    expect(requests.expert.tools?.[0]?.allowed_tools).toContain("get_vik_reference");
    expect(requests.expert.instructions).toBe(loadExpertInstructions());
    expect(requests.expert.instructions).toContain("Имам 20 къщи");
  });

  it("does not instruct the control model to answer poorly", () => {
    const source = readFileSync("src/vik-proektant/comparison/config.ts", "utf8") + readFileSync("src/vik-proektant/comparison/requests.ts", "utf8");
    expect(source.toLowerCase()).not.toContain("generic answer");
    expect(source.toLowerCase()).not.toContain("not an expert");
    expect(source.toLowerCase()).not.toContain("be vague");
    expect(requests.control).not.toHaveProperty("instructions");
  });

  it("handles independent failures and hides a model mismatch", async () => {
    const calls: unknown[] = [];
    const result = await runComparison(prompt, {
      env,
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown; input: string };
        calls.push(body);
        if (body.tools) return new Response("no", { status: 500 });
        return Response.json({ model: body.model, output_text: "control answer" });
      },
    });
    expect(calls).toHaveLength(2);
    expect((calls[0] as { input: string }).input).toBe((calls[1] as { input: string }).input);
    expect((calls[0] as { model: string }).model).toBe((calls[1] as { model: string }).model);
    expect(result.control.ok).toBe(true);
    expect(result.expert.ok).toBe(false);
    if (result.control.ok) expect(result.control.text).toBe("control answer");
    if (!result.expert.ok) expect(result.expert.error).toBe("upstream");

    const drifted = await runComparison(prompt, {
      env,
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { tools?: unknown };
        return Response.json({ model: body.tools ? "gpt-other" : "gpt-5.6", output_text: "hidden" });
      },
    });
    expect(drifted.fair).toBe(false);
    expect(drifted.expert.ok).toBe(false);
    if (!drifted.expert.ok) expect(drifted.expert.error).toBe("model_mismatch");
  });

  it("times out one side without replacing it with the other", async () => {
    const result = await runComparison(prompt, {
      env,
      timeoutMs: 30,
      fetchImpl: (_url, init) =>
        new Promise((resolve, reject) => {
          const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown };
          if (!body.tools) {
            resolve(Response.json({ model: body.model, output_text: "control answer" }));
            return;
          }
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });
    expect(result.control.ok).toBe(true);
    expect(result.expert.ok).toBe(false);
    if (result.control.ok) expect(result.control.text).toBe("control answer");
    if (!result.expert.ok) expect(result.expert.error).toBe("timeout");
  });

  it("counts real tool metadata and does not invent a winner", async () => {
    const result = await runComparison(prompt, {
      env,
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown };
        return Response.json({
          model: body.model,
          output_text: body.tools ? "expert answer" : "control answer",
          output: body.tools
            ? [
                {
                  type: "mcp_call",
                  name: "search_vik_knowledge",
                  output: JSON.stringify({ results: [{ documentId: "rd-02-20-2-2024" }, { documentId: "rd-02-20-2-2024" }] }),
                },
                { type: "mcp_call", name: "calculate_pipe_diameter", output: JSON.stringify({ result: { diameter_mm: 123.6 } }) },
              ]
            : [],
        });
      },
    });
    expect(result.summary).toEqual({
      sourceCount: 0,
      retrievalUsed: true,
      calculationPerformed: true,
      calculationInputRejected: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/winner|score|9\/10/i);
    if (result.expert.ok) {
      expect(result.expert.sources).toEqual([]);
      expect(result.expert.calculations[0]?.results[0]).toEqual({ key: "diameter_mm", value: "123.6", unit: "mm" });
    }
  });

  it("keeps source and calculation metadata on the tool output, not the model prose", async () => {
    const prose = "Наредба № 9999, чл. 9999 изисква DN 500.";
    const result = await runComparison(prompt, {
      env,
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown };
        return Response.json({
          model: body.model,
          output_text: prose,
          output: body.tools
            ? [
                {
                  type: "mcp_call",
                  name: "search_vik_knowledge",
                  output: JSON.stringify({
                    results: [
                      {
                        documentId: "rd-02-20-2-2024",
                        title: "Наредба № РД-02-20-2 от 3 юли 2024 г.",
                        number: "РД-02-20-2",
                        year: 2024,
                        dvReference: "ДВ, бр. 61 от 2024 г.",
                        article: "1",
                        section: "Общи положения",
                      },
                      {
                        documentId: "rd-02-20-2-2024",
                        title: "Наредба № РД-02-20-2 от 3 юли 2024 г.",
                        number: "РД-02-20-2",
                        year: 2024,
                        dvReference: "ДВ, бр. 61 от 2024 г.",
                        article: "2",
                        section: "Общи положения",
                      },
                    ],
                  }),
                },
                {
                  type: "mcp_call",
                  name: "get_vik_reference",
                  output: JSON.stringify({
                    referenceId: "vk1_rd-02-20-2-2024_a1_p1",
                    source: {
                      documentId: "rd-02-20-2-2024",
                      title: "Наредба № РД-02-20-2 от 3 юли 2024 г.",
                      number: "РД-02-20-2",
                      year: 2024,
                      dvReference: "ДВ, бр. 61 от 2024 г.",
                    },
                    article: "1",
                    section: "Общи положения",
                  }),
                },
                {
                  type: "mcp_call",
                  name: "calculate_pipe_diameter",
                  output: JSON.stringify({
                    operation: "calculate_pipe_diameter",
                    inputs: { flow: 4.8, flow_unit: "L/s", velocity_m_s: 1 },
                    result: { diameter_mm: 78.2 },
                    units: { diameter_mm: "mm" },
                  }),
                },
              ]
            : [],
        });
      },
    });
    expect(result.control.ok && result.control.text).toBe(prose);
    expect(result.expert.ok && result.expert.text).toBe(prose);
    if (!result.expert.ok) return;
    expect(result.expert.sources).toHaveLength(1);
    expect(result.expert.sources[0]?.title).toContain("РД-02-20-2");
    expect(result.expert.sources[0]?.locators).toEqual(["чл. 1 · Общи положения"]);
    expect(result.summary.sourceCount).toBe(1);
    expect(JSON.stringify(result.expert.sources)).not.toContain("9999");
    expect(result.expert.calculations[0]?.inputs[0]).toEqual({ key: "flow", value: "4.8 L/s" });
    expect(result.expert.calculations[0]?.results[0]?.value).toBe("78.2");
    expect(JSON.stringify(result.expert.calculations)).not.toContain("500");
  });
});

describe("comparison route", () => {
  it("validates prompts and preserves one prompt for both sides", async () => {
    resetRateLimits();
    const original = globalThis.fetch;
    const seen: string[] = [];
    process.env.OPENAI_API_KEY = "test-key";
    process.env.VIK_COMPARISON_MODEL = "gpt-5.6";
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { input: string; model: string };
      seen.push(`${body.model}:${body.input}`);
      return Response.json({ model: body.model, output_text: "ok" });
    };
    try {
      const rejected = await comparePost(new Request("http://local/api", { method: "POST", body: JSON.stringify({ prompt: "а" }) }));
      expect(rejected.status).toBe(400);
      const accepted = await comparePost(
        new Request("http://local/api", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: "Какъв наклон да заложа на тръбата?", locale: "bg", exampleId: "ambiguous" }),
        }),
      );
      expect(accepted.status).toBe(200);
      const payload = (await accepted.json()) as { control: { text?: string }; expert: { text?: string }; fair: boolean };
      expect(payload.fair).toBe(true);
      expect(payload.control.text).toBe("ok");
      expect(payload.expert.text).toBe("ok");
      expect(seen[0]).toBe(seen[1]);
      expect(JSON.stringify(payload)).not.toContain("test-key");
      expect(payload.control).not.toHaveProperty("sources");
    } finally {
      globalThis.fetch = original;
      delete process.env.OPENAI_API_KEY;
      delete process.env.VIK_COMPARISON_MODEL;
      resetRateLimits();
    }
  });
});

describe("comparison rate limit", () => {
  it("counts one user comparison for both sides and tells the caller when to retry", async () => {
    resetRateLimits();
    const original = globalThis.fetch;
    let calls = 0;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.VIK_COMPARISON_MODEL = "gpt-5.6";
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json({ model: "gpt-5.6", output_text: "ok" });
    };
    try {
      const skipped = await comparePost(new Request("http://local/api", { method: "POST", body: JSON.stringify({ prompt: "а" }) }));
      expect(skipped.status).toBe(400);
      expect(calls).toBe(0);
      for (let index = 0; index < COMPARE_LIMIT; index += 1) {
        const response = await comparePost(
          new Request("http://local/api", {
            method: "POST",
            headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
            body: JSON.stringify({ prompt: "Какъв диаметър да избера?" }),
          }),
        );
        expect(response.status).toBe(200);
      }
      expect(calls).toBe(COMPARE_LIMIT * 2);
      const blocked = await comparePost(
        new Request("http://local/api", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
          body: JSON.stringify({ prompt: "Какъв диаметър да избера?" }),
        }),
      );
      expect(blocked.status).toBe(429);
      expect(calls).toBe(COMPARE_LIMIT * 2);
      const body = (await blocked.json()) as { error: string; retryAfterMs: number };
      expect(body.error).toBe("rate_limited");
      expect(body.retryAfterMs).toBeGreaterThan(0);
      expect(body.retryAfterMs).toBeLessThanOrEqual(COMPARE_WINDOW_MS);
      expect(blocked.headers.get("retry-after")).toBe(String(Math.ceil(body.retryAfterMs / 1000)));
      const direct = takeToken("compare:demo", COMPARE_LIMIT, COMPARE_WINDOW_MS, 1_000);
      expect(direct.ok).toBe(true);
    } finally {
      globalThis.fetch = original;
      delete process.env.OPENAI_API_KEY;
      delete process.env.VIK_COMPARISON_MODEL;
      resetRateLimits();
    }
  });
});

describe("publication and examples", () => {
  it("does not invent a ChatGPT URL", () => {
    expect(chatGptDestination({}).state).toBe("awaiting_publication");
    expect(chatGptDestination({ VIK_CHATGPT_DESTINATION_URL: "http://example.com" }).state).toBe("awaiting_publication");
    expect(chatGptDestination({ VIK_CHATGPT_DESTINATION_URL: "https://chatgpt.com/example" }).url).toBe("https://chatgpt.com/example");
  });

  it("has the six demonstration prompts in both languages", () => {
    expect(comparisonExamples.map((item) => item.id)).toEqual([
      "missing-information",
      "source-requirement",
      "calculation",
      "design-reasoning",
      "ambiguous",
      "unsupported-rule",
    ]);
    for (const example of comparisonExamples) {
      expect(example.prompt.bg.length).toBeGreaterThan(8);
      expect(example.prompt.en.length).toBeGreaterThan(8);
    }
  });
});
