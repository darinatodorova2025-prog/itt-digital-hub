# Evaluation and Acceptance

Do not judge quality by JSON validity or attractive titles. Measure semantics.

Use `08_GOLDEN_SEED.json` as a synthetic starter and expand to ~50-80 ideas.

## Metrics
1. **False merge** - different problems grouped. Most dangerous. Target on curated set: **0**.
2. **False split** - same problem separated. Some conservative false splits acceptable.
3. **Coverage** - every source exactly once. Target 100%.
4. **Unsupported claim** - final theme introduces unsupported meaning. Target 0.
5. **Lost meaning** - source problem no longer recognizable. Target 0 critical.
6. **JAV audit quality** - known-good pass; known-bad fail/split.

Do not require exact titles; evaluate membership and fidelity.

## Required rehearsal before PASS
30-50 realistic ViK ideas, duplicates, hard near-matches, multiple roles, unrelated same-workflow problems, at least one JAV rejection, one audience rejection/split, complete review queue, voting transition, refresh/resume, no PII leak.

Run Mahni tests, clustering evals, typecheck, lint, production build. Do not claim PASS if curated false merges remain.
