import { describe, expect, it } from "vitest";
import { comparisonExamples, customScenarioGuide, scenarioGuides } from "../../src/content/vik-proektant";
import { POST as evaluatePost } from "../../src/app/api/vik-proektant/compare/evaluate/route";
import {
  JEV_DECISIONS_URL,
  JEV_MODEL,
  buildEvaluationRequest,
  evaluateAnswerComparison,
  parseEvaluationResponse,
} from "../../src/vik-proektant/comparison/evaluate";
import { resetRateLimits } from "../../src/vik-proektant/comparison/limits";
import { comparisonBand } from "../../src/vik-proektant/comparison/score";

const question = "Имам 20 къщи. Каква тръба да сложа за водопровода?";
const answerA = "Сложете DN 110.";
const answerB = "Данните не стигат за диаметър. Нужни са обитатели, едновременност и наличният напор.";

describe("jev evaluation", () => {
  it("asks three neutral score questions and keeps the score itself", () => {
    const request = buildEvaluationRequest({ question, answerA, answerB });
    expect(request.model).toBe(JEV_MODEL);
    expect(request.state).toEqual({ question, answer_a: answerA, answer_b: answerB });
    expect(Object.keys(request.questions)).toEqual(["grounding", "discipline", "usefulness"]);
    for (const item of Object.values(request.questions)) {
      expect(item.type).toBe("score");
      expect(item.criteria).toHaveLength(5);
      expect(item.criteria[2]).toMatch(/no meaningful difference/i);
      expect(item.instructions).toMatch(/do not reward verbosity/i);
      expect(item.instructions).toMatch(/if there is no meaningful difference, choose the neutral level/i);
    }
    const serialized = JSON.stringify(request).toLowerCase();
    expect(serialized).not.toMatch(/vik|expert|control|standard answer|itt|assistant|specialized/);

    const parsed = parseEvaluationResponse({
      answers: {
        discipline: { type: "score", score: 3.25, confidence: 0.1 },
        grounding: { type: "score", score: 2, confidence: 0.99 },
        usefulness: { type: "score", score: 0.4, confidence: 0.8 },
      },
    });
    expect(parsed).toEqual({
      discipline: { score: 3.25 },
      grounding: { score: 2 },
      usefulness: { score: 0.4 },
    });
    expect(comparisonBand(0.4)).toBe("weaker");
    expect(comparisonBand(2)).toBe("neutral");
    expect(comparisonBand(3.25)).toBe("better");
  });

  it("rejects a response that is not three scores on the scale", () => {
    expect(parseEvaluationResponse({ answers: { discipline: { type: "score", score: 2 } } })).toBeNull();
    expect(
      parseEvaluationResponse({
        answers: {
          discipline: { type: "score", score: 5 },
          grounding: { type: "score", score: 2 },
          usefulness: { type: "score", score: 2 },
        },
      }),
    ).toBeNull();
    expect(
      parseEvaluationResponse({
        answers: {
          discipline: { type: "score", confidence: 0.9 },
          grounding: { type: "score", score: 2 },
          usefulness: { type: "score", score: 2 },
        },
      }),
    ).toBeNull();
  });

  it("calls the decisions API and leaves the answers untouched when Jev fails", async () => {
    const calls: string[] = [];
    const missing = await evaluateAnswerComparison({ question, answerA, answerB }, { env: {} });
    expect(missing).toEqual({ ok: false, error: "configuration" });

    const scored = await evaluateAnswerComparison(
      { question, answerA, answerB },
      {
        env: { OPENROUTER_API_KEY: "or-test" },
        fetchImpl: async (url, init) => {
          calls.push(String(url));
          const body = JSON.parse(String(init?.body)) as { model: string; state: { answer_a: string } };
          expect(body.model).toBe(JEV_MODEL);
          expect(body.state.answer_a).toBe(answerA);
          expect(init?.headers).toMatchObject({ Authorization: "Bearer or-test" });
          return Response.json({
            model: "typesafe/jev-1.13-20260917",
            answers: {
              discipline: { type: "score", score: 1.1, confidence: 0.4 },
              grounding: { type: "score", score: 2.5, confidence: 0.4 },
              usefulness: { type: "score", score: 4, confidence: 0.4 },
            },
          });
        },
      },
    );
    expect(calls).toEqual([JEV_DECISIONS_URL]);
    expect(scored.ok && scored.comparison).toEqual({
      discipline: { score: 1.1 },
      grounding: { score: 2.5 },
      usefulness: { score: 4 },
    });

    const failed = await evaluateAnswerComparison(
      { question, answerA, answerB },
      {
        env: { OPENROUTER_API_KEY: "or-test" },
        fetchImpl: async () => new Response("no", { status: 502 }),
      },
    );
    expect(failed).toEqual({ ok: false, error: "upstream" });
  });

  it("times out without inventing a score", async () => {
    const result = await evaluateAnswerComparison(
      { question, answerA, answerB },
      {
        env: { OPENROUTER_API_KEY: "or-test" },
        timeoutMs: 20,
        fetchImpl: (_url, init) =>
          new Promise((resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            });
          }),
      },
    );
    expect(result).toEqual({ ok: false, error: "timeout" });
  });
});

describe("evaluation route", () => {
  it("returns scores and hides provider failures", async () => {
    resetRateLimits();
    const original = globalThis.fetch;
    process.env.OPENROUTER_API_KEY = "or-test";
    globalThis.fetch = async (url, init) => {
      expect(String(url)).toBe(JEV_DECISIONS_URL);
      expect(String(init?.body)).not.toContain("or-test");
      return Response.json({
        answers: {
          discipline: { type: "score", score: 3 },
          grounding: { type: "score", score: 2 },
          usefulness: { type: "score", score: 0 },
        },
      });
    };
    try {
      const accepted = await evaluatePost(
        new Request("http://local/api", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
          body: JSON.stringify({ question, answerA, answerB }),
        }),
      );
      expect(accepted.status).toBe(200);
      expect(await accepted.json()).toEqual({
        discipline: { score: 3 },
        grounding: { score: 2 },
        usefulness: { score: 0 },
      });

      globalThis.fetch = async () => new Response("bad", { status: 500 });
      const hidden = await evaluatePost(
        new Request("http://local/api", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.21" },
          body: JSON.stringify({ question, answerA, answerB }),
        }),
      );
      expect(hidden.status).toBe(503);
      expect(await hidden.json()).toMatchObject({ error: "unavailable" });
    } finally {
      globalThis.fetch = original;
      delete process.env.OPENROUTER_API_KEY;
      resetRateLimits();
    }
  });
});

describe("scenario guides", () => {
  it("follows the scenario id and keeps three points", () => {
    expect(Object.keys(scenarioGuides)).toEqual(comparisonExamples.map((item) => item.id));
    for (const example of comparisonExamples) {
      expect(scenarioGuides[example.id].points).toHaveLength(3);
      for (const point of scenarioGuides[example.id].points) {
        expect(point.bg.length).toBeGreaterThan(8);
        expect(point.en.length).toBeGreaterThan(8);
      }
    }
    expect(customScenarioGuide.points).toHaveLength(3);
    expect(customScenarioGuide.heading?.bg).toContain("свободен въпрос");
    expect(customScenarioGuide.heading?.en).toMatch(/open question/i);
  });
});
