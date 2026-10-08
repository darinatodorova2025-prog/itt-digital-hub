# JAV Semantic Audit Contract

## Role
JAV is an independent evaluator. It does not generate, rewrite, repair or make the final conference decision.

## Provider boundary
First inspect repository/environment for an existing JAV integration. Reuse it if real. If absent, implement a clean interface/schema/test double but **do not invent endpoints, model IDs, credentials or auth rules**. Report the exact missing runtime contract.

## Input
Proposed theme title/description + source ideas with `ideaId, body, role, frequency` + compact ViK context version. Organization identity is not a similarity signal.

## Questions
1. Same underlying problem?
2. Does every idea belong?
3. Is title faithful?
4. Unsupported claims?
5. Important meaning lost?
6. Split recommended?

## Structured output
`status: pass|fail|split_recommended`, `clusterConfidence`, per-idea `belongs/confidence/reasonCode`, `unsupportedClaims`, `lostMeaning`, `reasonCodes`. Persist concise decision reasons only, never private chain-of-thought.

## Pass gate
Pass only if every idea belongs, no unsupported claim, no critical lost meaning, and no split recommendation. At uncertainty prefer split.

## Outage
Retry transient failure. If still unavailable, mark admin `audit unavailable`, never pretend approval, and require explicit persisted operator override before human review. Public screen does not show provider errors.
