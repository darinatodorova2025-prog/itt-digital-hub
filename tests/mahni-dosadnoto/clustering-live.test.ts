import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { completeClusteringJson } from "@/mahni-dosadnoto/ai/clustering";
import { runClusteringPipeline } from "@/mahni-dosadnoto/ai/pipeline";
import { asSolComplete } from "@/mahni-dosadnoto/ai/sol";
import { coverageComplete, falseMergeCount, problemKey } from "@/mahni-dosadnoto/evals/score";

const LIVE = process.env.MAHNI_LIVE_SOL === "1";

function loadApiKey(): string | undefined {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((row) => row.startsWith("OPENAI_API_KEY="));
    return line?.slice("OPENAI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

type SeedIdea = { id: string; role: string; frequency: string; body: string; expectedCluster: string };

describe.skipIf(!LIVE)("mahni live sol rehearsal", () => {  it(
    "clusters the golden ViK set without a false merge",
    async () => {
      const key = loadApiKey();
      expect(key, "OPENAI_API_KEY is missing").toBeTruthy();
      process.env.OPENAI_API_KEY = key;
      const seed = JSON.parse(
        readFileSync("Игра конференция/mahni_clustering_v2_handoff/08_GOLDEN_SEED.json", "utf8"),
      ) as { ideas: SeedIdea[] };
      const extras: SeedIdea[] = [
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
      const ideas = [...seed.ideas, ...extras];
      expect(ideas.length).toBeGreaterThanOrEqual(30);
      expect(ideas.length).toBeLessThanOrEqual(50);
      const semantic = ideas.map((idea) => ({ id: idea.id, body: idea.body, role: idea.role, frequency: idea.frequency }));
      const proposed: Array<{ ideaIds: string[]; certain?: boolean; sharedProblem?: string | null }> = [];
      const pains: Array<{ ideaId: string; pain: string | null }> = [];
      const complete: typeof completeClusteringJson = async (schema, system, user, options) => {
        const result = await completeClusteringJson(schema, system, user, options);
        if (system.includes("ИНТЕРПРЕТАЦИЯ")) {
          const data = result.data as { ideas?: Array<{ ideaId: string; pain: string | null }> };
          for (const idea of data.ideas ?? []) pains.push({ ideaId: idea.ideaId, pain: idea.pain });
        }
        if (system.includes("КЛЪСТЕР")) {
          const data = result.data as { groups?: Array<{ ideaIds: string[]; certain?: boolean; sharedProblem?: string | null }> };
          proposed.push(...(data.groups ?? []));
        }
        return result;
      };
      const started = Date.now();
      const result = await runClusteringPipeline(semantic, { complete: asSolComplete(complete) });
      const expected = new Map(ideas.map((idea) => [idea.id, problemKey(idea)]));
      const groups = result.themes.map((theme) => theme.ideaIds);
      const falseMerges = falseMergeCount(groups, expected);
      const merged = result.themes
        .filter((theme) => new Set(theme.ideaIds.map((id) => expected.get(id))).size > 1)
        .map((theme) => ({
          ids: theme.ideaIds,
          keys: [...new Set(theme.ideaIds.map((id) => expected.get(id)))],
          title: theme.title,
        }));
      console.log(
        JSON.stringify({
          model: result.model,
          provider: result.provider,
          seconds: Math.round((Date.now() - started) / 1000),
          themes: result.themes.length,
          falseMerges,
          proposedMulti: proposed.filter((group) => group.ideaIds.length > 1).length,
          proposedFalseMerges: falseMergeCount(proposed.map((group) => group.ideaIds), expected),
          proposedCertain: proposed.filter((group) => group.certain === true && group.ideaIds.length > 1).length,
          finalMulti: groups.filter((group) => group.length > 1).length,
          painsWithText: pains.filter((item) => item.pain).length,
          coverage: coverageComplete(groups, ideas.map((idea) => idea.id)),
          audit: result.themes.map((theme) => theme.reviewStatus),
          merged,
        }),
      );
      expect(result.model.startsWith("gpt-6.1-sol")).toBe(true);
      expect(coverageComplete(groups, ideas.map((idea) => idea.id))).toBe(true);
      expect(falseMerges).toBe(0);
    },
    12 * 60_000,
  );
});
