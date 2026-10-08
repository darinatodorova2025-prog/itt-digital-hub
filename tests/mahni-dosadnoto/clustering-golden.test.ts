import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { enforceConservativeGroups } from "@/mahni-dosadnoto/ai/conservative-cluster";
import { interpretUserPrompt } from "@/mahni-dosadnoto/ai/interpret";
import {
  createJavAuditor,
  javDecisionPasses,
  JAV_MISSING_RUNTIME_CONTRACT,
  scriptedJavAuditor,
  type JavAuditDecision,
} from "@/mahni-dosadnoto/ai/jav-audit";
import { runClusteringPipeline, resplitCluster } from "@/mahni-dosadnoto/ai/pipeline";
import type { SolComplete } from "@/mahni-dosadnoto/ai/sol";
import { publicExcerpt } from "@/mahni-dosadnoto/public-excerpt";
import { coverageComplete, falseMergeCount, problemKey } from "@/mahni-dosadnoto/evals/score";
import { resetMemoryStoreForTests } from "@/mahni-dosadnoto/store/memory";

type SeedIdea = { id: string; role: string; frequency: string; body: string; expectedCluster: string };

const seed = JSON.parse(
  readFileSync("Игра конференция/mahni_clustering_v2_handoff/08_GOLDEN_SEED.json", "utf8"),
) as { ideas: SeedIdea[] };

const EXTRA: SeedIdea[] = [
  {
    id: "A4",
    role: "CAD/BIM",
    frequency: "daily",
    body: "След хидравличната сметка пак нанасям диаметрите в чертежа на ръка.",
    expectedCluster: "calc_to_drawings",
  },
  {
    id: "Z1",
    role: "quantity surveyor",
    frequency: "weekly",
    body: "Количествата в таблицата и тези в чертежа се сверяват отделно от самата сметка.",
    expectedCluster: "quantity_crosscheck",
  },
];

function passDecision(ideaIds: string[]): JavAuditDecision {
  return {
    status: "pass",
    clusterConfidence: 0.9,
    ideas: ideaIds.map((ideaId) => ({ ideaId, belongs: true, confidence: 0.9, reasonCode: "same_problem" })),
    unsupportedClaims: [],
    lostMeaning: [],
    reasonCodes: ["same_problem"],
  };
}

function failDecision(ideaIds: string[]): JavAuditDecision {
  return {
    status: "split_recommended",
    clusterConfidence: 0.2,
    ideas: ideaIds.map((ideaId) => ({ ideaId, belongs: false, confidence: 0.2, reasonCode: "split" })),
    unsupportedClaims: [],
    lostMeaning: [],
    reasonCodes: ["split"],
  };
}

function scriptedSol(painById: Map<string, string>): SolComplete {
  return async (schema, system, user) => {
    const payload = JSON.parse(user) as {
      ideas?: Array<{ ideaId: string; role?: string; frequency?: string | null; organization?: string }>;
      groups?: Array<{ ideaIds: string[]; sharedProblem?: string | null }>;
    };
    if (system.includes("ИНТЕРПРЕТАЦИЯ")) {
      expect(payload.ideas?.[0]).not.toHaveProperty("organization");
      return {
        data: schema.parse({
          ideas: (payload.ideas ?? []).map((idea) => ({
            ideaId: idea.ideaId,
            actorType: idea.role ?? null,
            workflowStage: null,
            task: null,
            object: null,
            pain: painById.get(idea.ideaId) ?? null,
            cause: null,
            desiredOutcome: null,
            explicitSolution: null,
            frequency: idea.frequency ?? null,
            domainTags: [],
          })),
        }),
        provider: "openai",
        model: "gpt-6.1-sol",
      };
    }
    if (system.includes("КЛЪСТЕР")) {
      const ids = (payload.ideas ?? []).map((idea) => idea.ideaId);
      const buckets = new Map<string, string[]>();
      for (const id of ids) {
        const pain = painById.get(id) ?? id;
        buckets.set(pain, [...(buckets.get(pain) ?? []), id]);
      }
      const grouped = [...buckets.entries()].map(([pain, ideaIds]) => ({ ideaIds, sharedProblem: pain, certain: true }));
      if (grouped.length >= 2 && grouped[0] && grouped[1]) {
        grouped[0] = {
          ideaIds: [...grouped[0].ideaIds, ...grouped[1].ideaIds],
          sharedProblem: "съмнително общо",
          certain: true,
        };
        grouped.splice(1, 1);
      }
      return {
        data: schema.parse({ groups: grouped }),
        provider: "openai",
        model: "gpt-6.1-sol",
      };
    }
    if (system.includes("ФОРМУЛИРОВКА")) {
      return {
        data: schema.parse({
          themes: (payload.groups ?? []).map((group) => {
            const pain = painById.get(group.ideaIds[0] ?? "") ?? "Отделна тема";
            return {
              ideaIds: group.ideaIds,
              title: pain.slice(0, 80),
              description: `Пресечна точка: ${pain}.`,
              formulationNote: `Формулирано само от общата болка ${pain}.`,
            };
          }),
        }),
        provider: "openai",
        model: "gpt-6.1-sol",
      };
    }
    if (system.includes("ПОПРАВКА")) {
      const groups = (payload.groups ?? []).flatMap((group) =>
        group.ideaIds.map((id) => ({ ideaIds: [id], sharedProblem: null, certain: false })),
      );
      return { data: schema.parse({ groups }), provider: "openai", model: "gpt-6.1-sol" };
    }
    throw new Error("unexpected sol step");
  };
}

describe("mahni clustering golden rehearsal", () => {
  it("rejects a known-bad audit and accepts a known-good one", () => {
    const good = passDecision(["a", "b"]);
    const bad = failDecision(["a", "b"]);
    expect(javDecisionPasses(good, ["a", "b"])).toBe(true);
    expect(javDecisionPasses(bad, ["a", "b"])).toBe(false);
    expect(javDecisionPasses({ ...good, unsupportedClaims: ["нов ефект"] }, ["a", "b"])).toBe(false);
    expect(JAV_MISSING_RUNTIME_CONTRACT.foundInRepository).toBe(false);
    expect(JAV_MISSING_RUNTIME_CONTRACT.missing.join(" ")).toContain("endpoint");
  });

  it("splits uncertain groups and ideas with no pain, and keeps a certain grounded group", () => {
    const split = enforceConservativeGroups(
      [
        { ideaId: "1", actorType: null, workflowStage: null, task: null, object: null, pain: "чертежи", cause: null, desiredOutcome: null, explicitSolution: null, frequency: null, domainTags: [] },
        { ideaId: "2", actorType: null, workflowStage: null, task: null, object: null, pain: null, cause: null, desiredOutcome: null, explicitSolution: null, frequency: null, domainTags: [] },
      ],
      [{ ideaIds: ["1", "2"], sharedProblem: "документи", certain: true }],
    );
    expect(split.map((group) => group.ideaIds)).toEqual([["1"], ["2"]]);
    const kept = enforceConservativeGroups(
      [
        { ideaId: "1", actorType: null, workflowStage: null, task: null, object: null, pain: "чертежи", cause: null, desiredOutcome: null, explicitSolution: null, frequency: null, domainTags: [] },
        { ideaId: "2", actorType: null, workflowStage: null, task: null, object: null, pain: "планове", cause: null, desiredOutcome: null, explicitSolution: null, frequency: null, domainTags: [] },
      ],
      [{ ideaIds: ["1", "2"], sharedProblem: "ръчно пренасяне", certain: true }],
    );
    expect(kept.map((group) => group.ideaIds)).toEqual([["1", "2"]]);
  });

  it("rehearses 50 ideas with zero false merges, one audit split, one audience split, and a closed voting gate", async () => {
    const catalog = [...seed.ideas, ...EXTRA];
    expect(catalog.length).toBeGreaterThanOrEqual(30);
    expect(catalog.length).toBeLessThanOrEqual(50);
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      {
        firstName: "Иван",
        lastName: "Петров",
        organization: "ВиК Бургас ООД",
        role: "Проектант",
        email: "ivan@example.com",
        phone: "0888123456",
        marketingConsent: false,
      },
      "tok",
    );
    const submitted: Array<{ goldenId: string; id: string; body: string; role: string; frequency: string }> = [];
    for (const [index, idea] of catalog.entries()) {
      const body = index === 0 ? `${idea.body} Пишете на ivan@example.com или 0888123456, Иван Петров от ВиК Бургас ООД.` : idea.body;
      const saved = await store.submitIdea("tok", body, idea.frequency);
      submitted.push({ goldenId: idea.id, id: saved.idea.id, body, role: idea.role, frequency: idea.frequency });
    }
    const painById = new Map(submitted.map((idea) => [idea.id, problemKey(catalog.find((item) => item.id === idea.goldenId)!)]));
    const expected = new Map(submitted.map((idea) => [idea.id, painById.get(idea.id)!]));
    const semantic = submitted.map((idea) => ({ id: idea.id, body: idea.body, role: idea.role, frequency: idea.frequency }));
    expect(interpretUserPrompt(semantic)).not.toContain("\"organization\"");

    let rejectedMerge = false;
    const jav = scriptedJavAuditor((input) => {
      const keys = new Set(input.ideas.map((idea) => painById.get(idea.ideaId)));
      const force = !rejectedMerge && input.ideas.length > 1 && [...keys][0] === "calc_to_drawings";
      if (force) rejectedMerge = true;
      return keys.size > 1 || force ? failDecision(input.ideas.map((idea) => idea.ideaId)) : passDecision(input.ideas.map((idea) => idea.ideaId));
    });
    const result = await runClusteringPipeline(semantic, { complete: scriptedSol(painById), jav });
    expect(result.model).toBe("gpt-6.1-sol");
    expect(rejectedMerge).toBe(true);
    const groups = result.themes.map((theme) => theme.ideaIds);
    expect(falseMergeCount(groups, expected)).toBe(0);
    expect(coverageComplete(groups, submitted.map((idea) => idea.id))).toBe(true);
    expect(result.themes.every((theme) => theme.reviewStatus === "review_ready")).toBe(true);

    await store.transitionPhase("ANALYZING");
    const run = await store.startAnalysisRun();
    await store.completeAnalysisRun(
      run.id,
      {
        themes: result.themes.map((theme) => ({
          title: theme.title,
          description: theme.description,
          ideaIds: theme.ideaIds,
          formulationNote: theme.formulationNote,
        })),
        wildcard: result.wildcard,
      },
      { provider: result.provider, model: result.model },
      result.themes.map((theme) => ({ reviewStatus: theme.reviewStatus, audit: theme.audit })),
    );
    await expect(store.transitionPhase("VOTING")).rejects.toThrow("review_open");

    const multi = (await store.listThemes()).find((theme) => !theme.isAiWildcard && (theme.sourceIdeas?.length ?? 0) > 1);
    if (!multi) throw new Error("missing multi-idea theme");
    const members = (multi.sourceIdeas ?? []).map((source) => {
      const idea = submitted.find((item) => item.id === source.id);
      return { id: source.id, body: source.body, role: idea?.role ?? "", frequency: idea?.frequency ?? null };
    });
    const split = await resplitCluster(members, ["audience_split"], scriptedSol(painById), jav);
    expect(split.every((theme) => theme.ideaIds.length === 1)).toBe(true);
    await store.replaceReviewTheme(multi.id, split);

    for (const theme of await store.listThemes()) {
      if (!theme.isAiWildcard && theme.reviewStatus === "review_ready") await store.approveAudienceTheme(theme.id);
    }
    await store.transitionPhase("VOTING");
    const ballot = (await store.listThemes()).filter((theme) => theme.reviewStatus === "approved" && !theme.isAiWildcard);
    const covered = new Set(ballot.flatMap((theme) => theme.sourceIdeas?.map((source) => source.id) ?? []));
    expect(covered.size).toBe(submitted.length);
    await store.castVote("tok", ballot[0]!.id);
    const wildcard = (await store.listThemes()).find((theme) => theme.isAiWildcard);
    await expect(store.castVote("tok", wildcard!.id)).rejects.toThrow("invalid_theme");

    const first = await store.getPublicLiveSnapshot();
    const second = await store.getPublicLiveSnapshot();
    const serialized = JSON.stringify(first);
    expect(serialized).toBe(JSON.stringify(second));
    expect(serialized).not.toContain("ivan@example.com");
    expect(serialized).not.toContain("0888123456");
    expect(serialized).not.toContain("Иван Петров");
    expect(serialized).not.toContain("ВиК Бургас ООД");
    expect((await store.listIdeasAdmin()).some((idea) => idea.body.includes("ivan@example.com"))).toBe(true);
    expect(publicExcerpt("Пишете на ivan@example.com или 0888123456, Иван Петров от ВиК Бургас ООД.", { organization: "ВиК Бургас ООД" })).not.toContain("ivan@example.com");
  });

  it("blocks voting until an explicit override when JAV is unavailable", async () => {
    const store = resetMemoryStoreForTests();
    await store.ensureCampaign();
    await store.transitionPhase("COLLECTING");
    await store.registerParticipant(
      { firstName: "A", lastName: "B", organization: "Офис", role: "Инженер", email: "a@example.com", marketingConsent: false },
      "tok",
    );
    const first = await store.submitIdea("tok", "Чертежите се поправят ръчно след всяка сметка.", "Всеки ден");
    const second = await store.submitIdea("tok", "Диаметрите се пренасят ръчно от сметката в плана.", "Всеки ден");
    const ideas = [
      { id: first.idea.id, body: first.idea.body, role: "Инженер", frequency: "Всеки ден" },
      { id: second.idea.id, body: second.idea.body, role: "Инженер", frequency: "Всеки ден" },
    ];
    const pains = new Map(ideas.map((idea) => [idea.id, "calc_to_drawings"]));
    await expect(createJavAuditor().audit({ contextVersion: "x", title: "t", description: "d", ideas: [] })).rejects.toThrow("audit_unavailable");
    const result = await runClusteringPipeline(ideas, { complete: scriptedSol(pains) });
    expect(result.themes.every((theme) => theme.reviewStatus === "audit_unavailable")).toBe(true);
    await store.transitionPhase("ANALYZING");
    const run = await store.startAnalysisRun();
    await store.completeAnalysisRun(
      run.id,
      {
        themes: result.themes.map((theme) => ({
          title: theme.title,
          description: theme.description,
          ideaIds: theme.ideaIds,
          formulationNote: theme.formulationNote,
        })),
        wildcard: result.wildcard,
      },
      { provider: result.provider, model: result.model },
      result.themes.map((theme) => ({ reviewStatus: theme.reviewStatus, audit: theme.audit })),
    );
    const live = await store.getPublicLiveSnapshot();
    expect(live.review).toBeNull();
    expect(JSON.stringify(live)).not.toContain("audit_unavailable");
    await expect(store.transitionPhase("VOTING")).rejects.toThrow("review_open");
    for (const theme of await store.listThemes()) {
      if (!theme.isAiWildcard) {
        await store.recordAuditOverride(theme.id, "editor@example.com", "Одитът липсва и залата ще прегледа темата директно.");
        await store.approveAudienceTheme(theme.id);
      }
    }
    await store.transitionPhase("VOTING");
    const approved = (await store.listThemes()).find((theme) => theme.reviewStatus === "approved");
    expect(approved?.auditOverride?.actorEmail).toBe("editor@example.com");
  });
});
