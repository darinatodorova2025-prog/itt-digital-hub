import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryStoreForTests } from "@/mahni-dosadnoto/store/memory";
import { validateClusteringAgainstIdeas, clusteringOutputSchema, clusteringOutputSchemaFor, clusteringThemeBounds } from "@/mahni-dosadnoto/validation";
import { clusteringUserPrompt } from "@/mahni-dosadnoto/ai/prompts";
import { themesForJury } from "@/mahni-dosadnoto/ai/jury-input";
import { rankHumanThemes, overlapCount, type ThemeScoreRow } from "@/mahni-dosadnoto/tie-break";
import { assertTransition, ideasAllowed, votingAllowed } from "@/mahni-dosadnoto/state-machine";
import type { Theme } from "@/mahni-dosadnoto/types";

describe("mahni-dosadnoto state machine", () => {
  it("allows expected transitions", () => {
    expect(() => assertTransition("COLLECTING", "ANALYZING")).not.toThrow();
    expect(() => assertTransition("COLLECTING", "VOTING")).toThrow();
  });

  it("gates ideas and votes by phase", () => {
    expect(ideasAllowed("COLLECTING")).toBe(true);
    expect(ideasAllowed("VOTING")).toBe(false);
    expect(votingAllowed("VOTING", null)).toBe(true);
    expect(votingAllowed("FINALIZING", null)).toBe(false);
  });
});

describe("mahni-dosadnoto store", () => {
  beforeEach(() => resetMemoryStoreForTests());

  it("registers and submits multiple raw ideas", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      {
        firstName: "Ivan",
        lastName: "T",
        organization: "Org A",
        role: "Eng",
        email: "a@test.example",
        phone: "",
        marketingConsent: false,
      },
      "token-a",
    );
    const first = await store.submitIdea("token-a", "Raw idea one", null);
    const second = await store.submitIdea("token-a", "Raw idea two", "Всяка седмица");
    expect(first.idea.body).toBe("Raw idea one");
    expect(second.idea.body).toBe("Raw idea two");
    expect(first.duplicate).toBe(false);
  });

  it("rejects ideas outside COLLECTING", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.registerParticipant(
      { firstName: "A", lastName: "B", organization: "O", role: "R", email: "b@test.example", marketingConsent: false },
      "tok",
    );
    await expect(store.submitIdea("tok", "x", null)).rejects.toThrow("not_collecting");
  });

  it("enforces vote limits and idempotency", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      { firstName: "A", lastName: "B", organization: "O", role: "R", email: "c@test.example", marketingConsent: false },
      "tok",
    );
    const ideaIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const { idea } = await store.submitIdea("tok", `Problem ${i}`, null);
      ideaIds.push(idea.id);
    }
    await store.transitionPhase("ANALYZING");
    const run = await store.startAnalysisRun();
    const output = clusteringOutputSchema.parse({
      themes: ideaIds.map((id, i) => ({
        title: `Tema ${i}`,
        description: "Описание на темата с достатъчно дължина.",
        ideaIds: [id],
      })),
      wildcard: { title: "Wildcard", description: "AI generated wildcard theme description." },
    });
    await store.completeAnalysisRun(run.id, output, { provider: "test", model: "test" });
    await store.transitionPhase("VOTING");
    const themes = await store.listThemes();
    const key = "vote-key-1";
    await store.castVote("tok", themes[0]!.id, key);
    const dup = await store.castVote("tok", themes[0]!.id, key);
    expect(dup.duplicate).toBe(true);
    await store.castVote("tok", themes[1]!.id);
    await store.castVote("tok", themes[2]!.id);
    await expect(store.castVote("tok", themes[3]!.id)).rejects.toThrow("vote_limit");
  });

  it("blocks RESULTS when jury is incomplete", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    store.campaign!.phase = "AI_JURY";
    await expect(store.transitionPhase("RESULTS")).rejects.toThrow("jury_incomplete");
  });

  it("keeps interest unique per theme", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    store.campaign!.phase = "VOTING";
    await store.registerParticipant(
      { firstName: "A", lastName: "B", organization: "O", role: "R", email: "d@test.example", marketingConsent: false },
      "tok",
    );
    const themeId = "00000000-0000-4000-8000-000000000001";
    store.themes.set(themeId, {
      id: themeId,
      campaignId: store.campaign!.id,
      analysisRunId: "run",
      title: "T",
      description: "D",
      isAiWildcard: false,
      sortOrder: 0,
      ideaCount: 0,
      organizationCount: 0,
      createdAt: new Date().toISOString(),
    });
    await store.setInterest("tok", themeId);
    await store.setInterest("tok", themeId);
    const ctx = await store.getParticipantContext("tok");
    expect(ctx.interestThemeIds).toEqual([themeId]);
  });

  it("does not expose PII in public live snapshot", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      {
        firstName: "Secret",
        lastName: "Person",
        organization: "Org",
        role: "R",
        email: "secret@company.test",
        phone: "0888",
        marketingConsent: false,
      },
      "tok",
    );
    await store.submitIdea("tok", "Public idea text", null);
    const snap = await store.getPublicLiveSnapshot();
    expect(JSON.stringify(snap)).not.toContain("secret@company.test");
    expect(JSON.stringify(snap)).not.toContain("Secret");
    expect(JSON.stringify(snap)).not.toContain("0888");
  });
});

describe("mahni-dosadnoto AI validation", () => {
  it("rejects hallucinated idea ids", () => {
    const output = {
      themes: [{ title: "Valid title", description: "D".repeat(12), ideaIds: ["00000000-0000-4000-8000-000000000099"] }],
      wildcard: { title: "Wildcard title", description: "Wildcard desc here." },
    } as import("@/mahni-dosadnoto/validation").ClusteringOutput;
    const valid = validateClusteringAgainstIdeas(output, new Set(["00000000-0000-4000-8000-000000000001"]));
    expect(valid.ok).toBe(false);
  });

  it("jury input excludes vote fields", () => {
    const themes: Theme[] = [
      {
        id: "1",
        campaignId: "c",
        analysisRunId: "r",
        title: "T",
        description: "D",
        isAiWildcard: false,
        sortOrder: 0,
        ideaCount: 2,
        organizationCount: 1,
        createdAt: "now",
      },
    ];
    const payload = themesForJury(themes);
    expect(JSON.stringify(payload)).not.toContain("vote");
  });
});

describe("mahni-dosadnoto ranking", () => {
  it("tie-breaks deterministically and computes overlap", () => {
    const mk = (id: string, sortOrder: number): ThemeScoreRow => ({
      theme: {
        id,
        campaignId: "c",
        analysisRunId: "r",
        title: id,
        description: "",
        isAiWildcard: false,
        sortOrder,
        ideaCount: 1,
        organizationCount: 1,
        createdAt: "",
      },
      voteCount: 5,
      interestOrgCount: 0,
      submissionOrgCount: 0,
    });
    const ranked = rankHumanThemes([mk("b", 2), mk("a", 1)]);
    expect(ranked[0]?.theme.id).toBe("a");
    expect(overlapCount(["a", "b", "c"], ["a", "x", "c"])).toBe(2);
  });
});

describe("mahni next campaign", () => {
  beforeEach(() => resetMemoryStoreForTests());

  it("archives a closed run and opens a clean draft the old session cannot enter", async () => {
    const store = resetMemoryStoreForTests();
    const closed = await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      { firstName: "Old", lastName: "Run", organization: "Org", role: "Eng", email: "old@example.test", marketingConsent: false },
      "old-token",
    );
    await store.submitIdea("old-token", "Historical idea", null);
    closed.phase = "CLOSED";

    const next = await store.prepareNextCampaign({ isDemo: true });
    expect(next.phase).toBe("DRAFT");
    expect(next.isDemo).toBe(true);
    expect(next.id).not.toBe(closed.id);
    expect(store.archived.some((row) => row.id === closed.id)).toBe(true);
    expect((await store.listParticipantsAdmin()).length).toBe(0);
    expect((await store.listIdeasAdmin()).length).toBe(0);
    expect((await store.getPublicLiveSnapshot()).stats).toMatchObject({ participants: 0, ideas: 0, votes: 0 });
    expect((await store.getParticipantContext("old-token")).participant).toBeNull();

    await store.transitionPhase("COLLECTING");
    await expect(store.submitIdea("old-token", "Must not land in the new run", null)).rejects.toThrow("unauthorized");
    expect((await store.listIdeasAdmin()).length).toBe(0);
    expect([...store.ideas.values()].some((idea) => idea.campaignId === closed.id && idea.body === "Historical idea")).toBe(true);
    await expect(store.prepareNextCampaign({ isDemo: false })).rejects.toThrow("not_closed");
  });

  it("rejects a theme from another campaign for vote, interest, and follow-up", async () => {
    const store = resetMemoryStoreForTests();
    const current = await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      { firstName: "Now", lastName: "Run", organization: "Org", role: "Eng", email: "now@example.test", marketingConsent: false },
      "now-token",
    );
    await store.transitionPhase("ANALYZING");
    await store.transitionPhase("VOTING");
    const foreign: Theme = {
      id: "11111111-1111-4111-8111-111111111111",
      campaignId: "archived-campaign",
      analysisRunId: "archived-run",
      title: "Old theme",
      description: "From the previous run",
      isAiWildcard: false,
      sortOrder: 0,
      ideaCount: 1,
      organizationCount: 1,
      createdAt: "",
    };
    store.themes.set(foreign.id, foreign);

    await expect(store.castVote("now-token", foreign.id)).rejects.toThrow("invalid_theme");
    await expect(store.setInterest("now-token", foreign.id)).rejects.toThrow("invalid_theme");
    current.phase = "RESULTS";
    await expect(store.requestFollowup("now-token", foreign.id)).rejects.toThrow("invalid_theme");
    expect(store.votes.size).toBe(0);
    expect(store.interests.size).toBe(0);
    expect(store.followups.size).toBe(0);
  });
});

describe("mahni clustering size", () => {
  it("shrinks the theme band to the number of ideas", () => {
    expect(clusteringThemeBounds(2)).toEqual({ min: 1, max: 2 });
    expect(clusteringThemeBounds(40)).toEqual({ min: 8, max: 12 });
    const two = clusteringOutputSchemaFor(2);
    expect(two.safeParse({
      themes: [
        { title: "Една", description: "Достатъчно дълго описание.", ideaIds: ["11111111-1111-4111-8111-111111111111"] },
        { title: "Две", description: "Достатъчно дълго описание.", ideaIds: ["22222222-2222-4222-8222-222222222222"] },
      ],
      wildcard: { title: "Отвъд", description: "Отделно предложение от ИИ." },
    }).success).toBe(true);
    expect(two.safeParse({
      themes: Array.from({ length: 8 }, (_, i) => ({
        title: `Тема ${i}`,
        description: "Достатъчно дълго описание.",
        ideaIds: ["11111111-1111-4111-8111-111111111111"],
      })),
      wildcard: { title: "Отвъд", description: "Отделно предложение от ИИ." },
    }).success).toBe(false);
    const prompt = clusteringUserPrompt([
      { id: "11111111-1111-4111-8111-111111111111", body: "а", organization: "А" },
      { id: "22222222-2222-4222-8222-222222222222", body: "б", organization: "Б" },
    ]);
    expect(prompt).toContain("1–2 теми");
    expect(prompt).not.toContain("10–12");
  });
});
