# Clustering Engine Specification

## 1. INTERPRET
Process every idea independently before grouping. Input: `ideaId`, raw `body`, participant `role`, `frequency`. Exclude organization from semantic similarity.

Recommended fingerprint: `ideaId, actorType, workflowStage, task, object, pain, cause, desiredOutcome, explicitSolution, frequency, domainTags`. Missing information is `null`; preserve ambiguity; do not invent causes/outcomes.

## 2. CONSERVATIVE CLUSTER
Input fingerprints + raw texts + ViK event context. Merge only when one concise underlying problem statement is truthful for every idea without adding a new claim. False merge is worse than false split. No fixed final count.

## 3. SYNTHESIZE
Only after membership is fixed. Output `title`, `description`, `formulationNote`. Use the **intersection** of source ideas. Do not create a broad super-theme or add AI/technology/impact/causes/solutions unless supported.

## 4. DETERMINISTIC VALIDATION
Every active-campaign idea exactly once; no unknown IDs; no duplicate assignment; no empty real theme; wildcard has no participant IDs; sourceIdeas match persisted links; no cross-campaign IDs. Fail closed.

## 5. JAV AUDIT
See `04_JAV_AUDIT_CONTRACT.md`.

## 6. REPAIR
Only failed clusters are repaired. Maximum one automatic repair cycle. If re-audit fails, split to smaller safe groups or individual themes. Never force a merge.

## Theme count
No hard 8-12 semantic target. Presentation limits must not corrupt semantic grouping.

## Manual combine
Must first evaluate compatibility and may return `mergeable:false`. If false, do not mutate storage. If true: synthesize -> validate -> JAV audit -> audience review.

## No ideas
Do not start AI. Disable action and show clear operator message.
