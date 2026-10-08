# Mahni Dosadnoto - Clustering V2 Handoff

Source-of-truth package for rebuilding the **Подреждаме** phase.

## Source-of-truth order
1. Current repository code/database schema for existing behavior.
2. Files in this package for the new clustering/review behavior.
3. The GOAL prompt orchestrates the work but must not override contradictions in 1-2.
4. Generated examples are synthetic evaluation material, not production data.

## Required reading order
1. `00_GOAL_PROMPT.md`
2. `01_CURRENT_STATE_AND_PRESERVE.md`
3. `02_VIK_EVENT_CONTEXT.md`
4. `03_CLUSTERING_ENGINE_SPEC.md`
5. `04_JAV_AUDIT_CONTRACT.md`
6. `05_AUDIENCE_REVIEW_SPEC.md`
7. `06_SECURITY_AND_DATA_RULES.md`
8. `07_EVAL_ACCEPTANCE_SPEC.md`
9. `08_GOLDEN_SEED.json`

**Product principle: GPT-6.1 Sol proposes. JAV audits. The audience decides.**

False merge is materially worse than false split.
