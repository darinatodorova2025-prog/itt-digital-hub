# PROMPT 12 — Participant Screen-by-Screen Implementation


Repository: https://github.com/darinatodorova2025-prog/itt-digital-hub
Branch: `feature/mahni-dosadnoto`
Preview: https://itt-digital-hub-git-fe-607b43-darinatodorova2025-6319s-projects.vercel.app

Before editing, read:
- README.md
- docs/00_HANDOFF_CONTEXT.md
- docs/01_MASTER_VISUAL_SPEC.md
- docs/02_COMPONENT_CONTRACTS.md
- docs/03_STATE_LOADING_SPEC.md
- docs/04_ASSET_MAP.md


Read:
- docs/05_PARTICIPANT_SCREEN_SPEC.md
- docs/08_ACCEPTANCE_QA.md

References:
- participant standalone references
- exact crops
- master board

Scope ONLY:
`/bg/mahni-dosadnoto`

Do not touch live/admin except shared components that are strictly required.

Implementation method:
Implement ONE participant state at a time:

P01 Welcome
→ render at 390×844 and 430px
→ compare with reference
→ correct
→ only then continue.

Then:
P02 Share idea
P03 Idea added
P04 Organizing
P05 Voting
P06 Second view
P07 Result

Important:
- reference image is visual target, not bitmap UI;
- real production copy/data is source of truth;
- do not recreate logo from screenshot;
- do not hardcode demo numbers;
- result must preserve participant ranking as official;
- AI is secondary.

At each screen compare:
- content hierarchy
- spacing
- typography
- image crop
- CTA weight
- border/radius
- icon size
- mobile density

Do not stop after the first plausible implementation.
Use browser screenshots and iterate until the gap is small.

Run relevant tests/build.

Return a state-by-state report with exact viewports inspected, commit and preview.
