import { describe, expect, it } from "vitest";
import { combineButtonEnabled, extractButtonLabel } from "@/mahni-dosadnoto/review";
import { resetMemoryStoreForTests } from "@/mahni-dosadnoto/store/memory";
import { clusteringOutputSchemaFor } from "@/mahni-dosadnoto/validation";

describe("mahni live review edits", () => {
  it("names the extract button by how many ideas are checked", () => {
    expect(extractButtonLabel(0)).toBe("Извади идеята");
    expect(extractButtonLabel(1)).toBe("Извади идеята");
    expect(extractButtonLabel(2)).toBe("Извади идеите");
    expect(combineButtonEnabled(1)).toBe(false);
    expect(combineButtonEnabled(2)).toBe(true);
  });

  it("pulls checked ideas out of a combination and keeps them after refresh", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      { firstName: "A", lastName: "B", organization: "ВиК", role: "Инженер", email: "review@example.test", marketingConsent: false },
      "tok",
    );
    const first = await store.submitIdea("tok", "Преписваме протоколите на ръка след всяка среща.", null);
    const second = await store.submitIdea("tok", "После търсим в тези протоколи кой какво е казал.", null);
    await store.transitionPhase("ANALYZING");
    const run = await store.startAnalysisRun();
    const output = clusteringOutputSchemaFor(2).parse({
      themes: [
        {
          title: "Ръчни протоколи",
          description: "Протоколите се преписват и после се търсят.",
          ideaIds: [first.idea.id, second.idea.id],
          formulationNote: "Двата текста са за един и същ ръчен протокол.",
        },
      ],
      wildcard: { title: "Отвъд залата", description: "Отделно предложение от модела тук." },
    });
    await store.completeAnalysisRun(run.id, output, { provider: "openai", model: "gpt-6.1-sol" });

    const before = await store.listThemes();
    const combined = before.find((item) => !item.isAiWildcard);
    if (!combined) throw new Error("missing combination");
    expect(combined.sourceIdeas?.map((source) => source.body)).toEqual([first.idea.body, second.idea.body]);
    expect(combined.formulationNote).toContain("ръчен протокол");
    const live = await store.getPublicLiveSnapshot();
    expect(live.review?.excerpts.join(" ")).toContain("Преписваме протоколите");
    expect(JSON.stringify(live.review)).not.toContain("review@example.test");

    const extracted = await store.extractReviewIdeas(combined.id, [second.idea.id]);
    const review = await store.listThemes();
    const parent = review.find((item) => item.id === combined.id);
    const standalone = review.find((item) => item.sourceIdeas?.length === 1 && item.sourceIdeas[0]?.id === second.idea.id);
    expect(extracted.openedId).toBe(combined.id);
    expect(parent?.sourceIdeas?.map((source) => source.id)).toEqual([first.idea.id]);
    expect(standalone?.title).toBe(second.idea.body);
    expect(standalone?.formulationNote).toContain("Извадена от");
    expect(review.filter((item) => item.sourceIdeas?.some((source) => source.id === second.idea.id))).toHaveLength(1);

    await expect(store.extractReviewIdeas(combined.id, [second.idea.id])).rejects.toThrow("invalid_theme");

    if (!parent || !standalone) throw new Error("missing split result");
    const merged = await store.mergeReviewThemes([parent.id, standalone.id], {
      title: "Една тема за протоколите",
      description: "Преписването и търсенето са една работа.",
      formulationNote: "Двата оригинални текста са събрани отново в едно изречение.",
    });
    const after = await store.listThemes();
    const again = after.find((item) => item.id === merged.openedId);
    expect(again?.title).toBe("Една тема за протоколите");
    expect(again?.sourceIdeas?.map((source) => source.id).sort()).toEqual([first.idea.id, second.idea.id].sort());
    expect(after.filter((item) => !item.isAiWildcard)).toHaveLength(1);
  });

  it("hides source text from the public snapshot once grouping is over", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    store.campaign!.phase = "VOTING";
    const snap = await store.getPublicLiveSnapshot();
    expect(snap.review).toBeNull();
  });
});
