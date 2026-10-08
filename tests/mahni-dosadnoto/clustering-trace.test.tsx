import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AudienceReviewCard } from "@/mahni-dosadnoto/CombiningReview";
import { SYNTHESIZE_SYSTEM } from "@/mahni-dosadnoto/ai/synthesize";
import { completeClusteringJson } from "@/mahni-dosadnoto/ai/clustering";
import { CLUSTERING_MODEL } from "@/mahni-dosadnoto/ai/clustering-model";
import { clusteringUserPrompt } from "@/mahni-dosadnoto/ai/prompts";
import { resetMemoryStoreForTests } from "@/mahni-dosadnoto/store/memory";
import { clusteringOutputSchemaFor } from "@/mahni-dosadnoto/validation";

const IDEA_ID = "11111111-1111-4111-8111-111111111111";

describe("mahni clustering trace", () => {
  it("uses gpt-6.1-sol on the responses API and keeps the model formulation", async () => {
    const calls: Array<{ url: string; model: string }> = [];
    const schema = clusteringOutputSchemaFor(1);
    const result = await completeClusteringJson(schema, "system", "user", {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (url, init) => {
        const body = JSON.parse(String(init?.body)) as { model: string };
        calls.push({ url: String(url), model: body.model });
        return new Response(
          JSON.stringify({
            model: "gpt-6.1-sol",
            output_text: JSON.stringify({
              themes: [
                {
                  title: "Ръчни протоколи",
                  description: "Описание на ръчните протоколи.",
                  ideaIds: [IDEA_ID],
                  formulationNote: "Единствената идея за протоколи е оставена като една тема.",
                },
              ],
              wildcard: {
                title: "Отвъд залата",
                description: "Отделно предложение от модела.",
                formulationNote: "Това не идва от подадена идея на участник.",
              },
            }),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    expect(CLUSTERING_MODEL).toBe("gpt-6.1-sol");
    expect(calls).toEqual([{ url: "https://api.openai.com/v1/responses", model: "gpt-6.1-sol" }]);
    expect(result.model).toBe("gpt-6.1-sol");
    expect(result.provider).toBe("openai");
    expect(result.data.themes[0]?.formulationNote).toContain("протоколи");
  });

  it("does not call the model when the key is missing and rejects a different model", async () => {
    let called = false;
    const schema = clusteringOutputSchemaFor(1);
    await expect(
      completeClusteringJson(schema, "system", "user", {
        env: {},
        fetchImpl: async () => {
          called = true;
          return new Response("{}", { status: 200 });
        },
      }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
    expect(called).toBe(false);

    await expect(
      completeClusteringJson(schema, "system", "user", {
        env: { OPENAI_API_KEY: "test-key" },
        fetchImpl: async () =>
          new Response(JSON.stringify({ model: "gpt-4.1-mini", output_text: "{}" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      }),
    ).rejects.toThrow(/model_mismatch/);
  });

  it("persists source text and a formulation note, and rebuilds the note from links", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      { firstName: "A", lastName: "B", organization: "ВиК", role: "Инженер", email: "trace@example.test", marketingConsent: false },
      "tok",
    );
    const { idea } = await store.submitIdea("tok", "Ръчно преписване на протоколи всеки понеделник", null);
    await store.transitionPhase("ANALYZING");
    const run = await store.startAnalysisRun();
    const output = clusteringOutputSchemaFor(1).parse({
      themes: [
        {
          title: "Ръчни протоколи",
          description: "Описание на ръчните протоколи.",
          ideaIds: [idea.id],
          formulationNote: "Взех единствената идея за ръчно преписване и я оставих като тема.",
        },
      ],
      wildcard: { title: "Отвъд залата", description: "Отделно предложение от модела тук." },
    });
    await store.completeAnalysisRun(run.id, output, { provider: "openai", model: CLUSTERING_MODEL });
    for (const theme of await store.listThemes()) {
      if (!theme.isAiWildcard) await store.approveAudienceTheme(theme.id);
    }

    const themes = await store.listThemes();
    const grouped = themes.find((theme) => !theme.isAiWildcard);
    const wildcard = themes.find((theme) => theme.isAiWildcard);
    expect(grouped?.sourceIdeas).toEqual([{ id: idea.id, body: idea.body }]);
    expect(grouped?.formulationNote).toContain("ръчно преписване");
    expect(wildcard?.sourceIdeas).toEqual([]);
    expect(wildcard?.formulationNote).toContain("Допълнително предложение");

    await store.transitionPhase("VOTING");
    const snap = await store.getPublicLiveSnapshot();
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain("Взех единствената идея");
    expect(serialized).not.toContain(idea.body);
    expect(serialized).toContain("Ръчни протоколи");

    const stored = [...store.themes.values()].find((theme) => theme.id === grouped?.id);
    if (!stored) throw new Error("missing stored theme");
    stored.sourceIdeas = [];
    stored.formulationNote = "";
    const rebuilt = (await store.listThemes()).find((theme) => theme.id === stored.id);
    expect(rebuilt?.sourceIdeas).toEqual([{ id: idea.id, body: idea.body }]);
    expect(rebuilt?.formulationNote).toContain("Ръчно преписване на протоколи");
  });

  it("asks synthesis for a formulation note and does not demand a theme count", () => {
    const prompt = clusteringUserPrompt([{ id: IDEA_ID, body: "а", role: "Инженер", frequency: "Всеки ден" }]);
    expect(prompt).not.toContain("8–12");
    expect(prompt).not.toContain("organization");
    expect(SYNTHESIZE_SYSTEM).toContain("formulationNote");
  });

  it("renders the projector review as a read-only question", () => {
    const html = renderToStaticMarkup(
      createElement(AudienceReviewCard, {
        card: {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Ръчни протоколи",
          description: "Хората преписват протоколи на ръка.",
          ideaCount: 1,
          organizationCount: 1,
          mapping: "1 идея -> 1 тема",
          excerpts: ["Ръчно преписване на протоколи всеки понеделник"],
          question: "Това представя ли правилно тези идеи?",
        },
      }),
    );
    expect(html).toContain("1 идея -&gt; 1 тема");
    expect(html).toContain("Ръчни протоколи");
    expect(html).toContain("Това представя ли правилно тези идеи?");
    expect(html).not.toContain("checkbox");
    expect(html).not.toContain("Комбинирай");
  });
});
