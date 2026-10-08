# GOAL - Reliable human-approved clustering

Rebuild ONLY the intelligence and review workflow of **Подреждаме** on top of the current implementation. Do not rewrite the whole feature.

## Target flow
RAW IDEAS -> GPT-6.1 Sol INTERPRET -> CONSERVATIVE CLUSTER -> SYNTHESIZE -> DETERMINISTIC VALIDATION -> JAV SEMANTIC AUDIT -> optional one-cycle REPAIR/SPLIT -> HUMAN AUDIENCE REVIEW -> APPROVED THEMES -> VOTING.

## Non-negotiable rules
- Remove hard semantic pressure to force a fixed number such as 8-12 themes.
- Use `body + role + frequency` for semantic understanding.
- Do not use organization name as semantic similarity.
- Keep organization only for post-clustering counts/follow-up/analytics.
- Merge only when one concise underlying problem is true for every source idea.
- At uncertainty, keep ideas separate.
- Synthesis expresses the intersection, not a union of all details.
- Sector context helps interpret terminology but never invents problem/cause/solution/requirement/fact.
- Preserve `sourceIdeas`, `formulationNote`, provider/model trace, campaign isolation and deterministic coverage validation.
- Public live is read-only.
- Every state-changing review action requires normal staff/editor authorization.
- Raw participant text is admin-only; public live uses sanitized excerpts.
- JAV never rewrites themes; it only returns structured audit decisions.
- Human audience approval is persisted explicitly.
- Only approved themes reach voting.
- If JAV is unavailable, operator may continue only via explicit recorded override.
- If repair still fails, split conservatively. Never force a merge.
- Audience review remains inside **Подреждаме**. Do not add a sixth public phase.
- Do not change voting, AI Jury, results or unrelated products except minimal compatibility changes.

## First action
Inspect current implementation in `src/mahni-dosadnoto/ai/`, `validation.ts`, `types.ts`, `review.ts`, `CombiningReview.tsx`, `MahniLiveScreen.tsx`, `MahniAdminDashboard.tsx`, `store/`, review API routes, Supabase migrations, plus ViK Projektant architecture/knowledge/evals.

Then compare current code against every spec file in this package before editing.

## Definition of done
Do not claim PASS unless the Sol pipeline is implemented, JAV is really connected or the exact missing runtime contract is reported, semantic audit is enforced, public mutations are staff-authenticated, audience approval is persisted, only approved themes reach voting, golden evals are executed, curated false-merge count is zero, a 30-50 idea rehearsal succeeds, and typecheck/lint/tests/build pass.

Do not merge or deploy production without explicit instruction.
