# PROMPT 13 — Live Screen-by-Screen Implementation


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
- docs/06_LIVE_SCREEN_SPEC.md
- docs/08_ACCEPTANCE_QA.md

Scope ONLY:
`/bg/mahni-dosadnoto/live`

Do not redesign participant/admin.

Implement and validate sequentially:

L01 Collecting
L02 Organizing
L03 Voting
L04 Countdown
L05 Second view
L06 Result

For EACH phase:
1. render at 1920×1080;
2. compare side-by-side to reference;
3. fix hierarchy/crop/overlay/density;
4. test 1366×768;
5. only then continue.

Critical:
- no false initial scene;
- real photography must remain visible;
- darken locally behind text instead of flattening whole image;
- projector readability beats decorative detail;
- maximum useful ranking rows;
- result must be the visual climax;
- participant result clearly dominates independent AI view.

Do not hardcode counts or ranking.

No raw provider errors.

Run relevant tests/build.

Return phase-by-phase differences closed, viewports inspected, commit and preview.
