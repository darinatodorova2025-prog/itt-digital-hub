import type { ThemeAuditRecord, ThemeReviewStatus } from "../types";
import { validateClusteringAgainstIdeas } from "../validation";
import { enforceConservativeGroups, proposeClusters, type ConservativeGroup } from "./conservative-cluster";
import { interpretIdeas } from "./interpret";
import { auditInputFor, createJavAuditor, decisionToRecord, javDecisionPasses, type JavAuditor } from "./jav-audit";
import type { SemanticIdea } from "./semantic";
import type { SolComplete } from "./sol";
import { fallbackTheme, repairUserPrompt, REPAIR_SYSTEM, synthesizeGroups, wildcardTheme, type DraftTheme } from "./synthesize";

export type CommittedTheme = DraftTheme & {
  reviewStatus: ThemeReviewStatus;
  audit: ThemeAuditRecord | null;
};

export type PipelineResult = {
  themes: CommittedTheme[];
  wildcard: { title: string; description: string; formulationNote: string };
  provider: string;
  model: string;
};

type Judgement = {
  theme: DraftTheme;
  outcome: "pass" | "fail" | "unavailable";
  audit: ThemeAuditRecord;
};

function sameSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const wanted = new Set(right);
  return left.every((id) => wanted.has(id));
}

async function judgeTheme(theme: DraftTheme, ideas: SemanticIdea[], jav: JavAuditor): Promise<Judgement> {
  try {
    const decision = await jav.audit(auditInputFor(theme, ideas));
    const passed = javDecisionPasses(decision, theme.ideaIds);
    return { theme, outcome: passed ? "pass" : "fail", audit: decisionToRecord(decision) };
  } catch (error) {
    const unavailable = error instanceof Error && (error.name === "JavNotConfiguredError" || error.message === "audit_unavailable");
    if (!unavailable) throw error;
    return { theme, outcome: "unavailable", audit: decisionToRecord("unavailable") };
  }
}

function commit(judgement: Judgement, reviewStatus: ThemeReviewStatus): CommittedTheme {
  return { ...judgement.theme, reviewStatus, audit: judgement.audit };
}

function singletons(ideaIds: string[]): ConservativeGroup[] {
  return ideaIds.map((id) => ({ ideaIds: [id], sharedProblem: null }));
}

async function finishSingletons(ideaIds: string[], ideas: SemanticIdea[], jav: JavAuditor): Promise<CommittedTheme[]> {
  const drafts = singletons(ideaIds).map((group) => fallbackTheme(group, ideas));
  const judged = await Promise.all(drafts.map((theme) => judgeTheme(theme, ideas, jav)));
  return judged.map((item) => {
    if (item.outcome === "unavailable") return commit(item, "audit_unavailable");
    return commit(item, "review_ready");
  });
}

export async function resplitCluster(
  ideas: SemanticIdea[],
  reasonCodes: string[],
  complete: SolComplete,
  jav: JavAuditor = createJavAuditor(),
): Promise<CommittedTheme[]> {
  const interpreted = await interpretIdeas(ideas, complete);
  const seed: ConservativeGroup[] = [{ ideaIds: ideas.map((idea) => idea.id), sharedProblem: null }];
  let proposed;
  try {
    proposed = await proposeClusters(
      ideas,
      interpreted.fingerprints,
      complete,
      REPAIR_SYSTEM,
      repairUserPrompt(seed, ideas, reasonCodes),
    );
  } catch {
    proposed = ideas.map((idea) => ({ ideaIds: [idea.id], sharedProblem: null, certain: false }));
  }
  const groups = enforceConservativeGroups(interpreted.fingerprints, proposed);
  const stillOneGroup = groups.length === 1 && groups[0]?.ideaIds.length === ideas.length && ideas.length > 1;
  const forced = stillOneGroup ? singletons(ideas.map((idea) => idea.id)) : groups;
  const drafts = await synthesizeGroups(forced, ideas, complete);
  const judged = await Promise.all(drafts.map((theme) => judgeTheme(theme, ideas, jav)));
  const themes: CommittedTheme[] = [];
  for (const item of judged) {
    if (item.outcome === "fail" && item.theme.ideaIds.length > 1) {
      themes.push(...(await finishSingletons(item.theme.ideaIds, ideas, jav)));
    } else if (item.outcome === "unavailable") {
      themes.push(commit(item, "audit_unavailable"));
    } else {
      themes.push(commit(item, "review_ready"));
    }
  }
  assertCoverage(themes, ideas.map((idea) => idea.id));
  return themes;
}

function assertCoverage(themes: Array<{ ideaIds: string[] }>, ideaIds: string[]) {
  const output = {
    themes: themes.map((theme) => ({
      title: "Тема",
      description: "Покритие на подадените идеи.",
      ideaIds: theme.ideaIds,
      formulationNote: null,
    })),
    wildcard: { title: "Допълнително предложение", description: "Отделно предложение извън идеите.", formulationNote: null },
  };
  const valid = validateClusteringAgainstIdeas(output, new Set(ideaIds));
  if (!valid.ok) throw new Error(valid.reason);
}

export async function runClusteringPipeline(
  ideas: SemanticIdea[],
  options: { complete: SolComplete; jav?: JavAuditor },
): Promise<PipelineResult> {
  if (ideas.length === 0) throw new Error("no_ideas");
  const jav = options.jav ?? createJavAuditor();
  const interpreted = await interpretIdeas(ideas, options.complete);
  const proposed = await proposeClusters(ideas, interpreted.fingerprints, options.complete);
  const groups = enforceConservativeGroups(interpreted.fingerprints, proposed);
  const drafts = await synthesizeGroups(groups, ideas, options.complete);
  const judged = await Promise.all(drafts.map((theme) => judgeTheme(theme, ideas, jav)));

  const kept: CommittedTheme[] = [];
  const failed = judged.filter((item) => item.outcome === "fail");
  for (const item of judged) {
    if (item.outcome === "pass") kept.push(commit(item, "review_ready"));
    if (item.outcome === "unavailable") kept.push(commit(item, "audit_unavailable"));
  }

  if (failed.length > 0) {
    const failedIds = new Set(failed.flatMap((item) => item.theme.ideaIds));
    const failedIdeas = ideas.filter((idea) => failedIds.has(idea.id));
    const failedPrints = interpreted.fingerprints.filter((item) => failedIds.has(item.ideaId));
    const reasonCodes = [...new Set(failed.flatMap((item) => item.audit.reasonCodes))];
    let repaired;
    try {
      repaired = await proposeClusters(
        failedIdeas,
        failedPrints,
        options.complete,
        REPAIR_SYSTEM,
        repairUserPrompt(
          failed.map((item) => ({ ideaIds: item.theme.ideaIds, sharedProblem: null })),
          failedIdeas,
          reasonCodes,
        ),
      );
    } catch {
      repaired = failedIdeas.map((idea) => ({ ideaIds: [idea.id], sharedProblem: null, certain: false }));
    }
    const nextGroups = enforceConservativeGroups(failedPrints, repaired).flatMap((group) => {
      const unchanged = failed.some((item) => sameSet(item.theme.ideaIds, group.ideaIds) && group.ideaIds.length > 1);
      return unchanged ? singletons(group.ideaIds) : [group];
    });
    const redrafted = await synthesizeGroups(nextGroups, ideas, options.complete);
    const rejudged = await Promise.all(redrafted.map((theme) => judgeTheme(theme, ideas, jav)));
    for (const item of rejudged) {
      if (item.outcome === "fail" && item.theme.ideaIds.length > 1) {
        kept.push(...(await finishSingletons(item.theme.ideaIds, ideas, jav)));
      } else if (item.outcome === "unavailable") {
        kept.push(commit(item, "audit_unavailable"));
      } else {
        kept.push(commit(item, "review_ready"));
      }
    }
  }

  assertCoverage(kept, ideas.map((idea) => idea.id));
  return {
    themes: kept,
    wildcard: wildcardTheme(),
    provider: interpreted.provider,
    model: interpreted.model,
  };
}
