# PROMPT 11 — Foundation + Rendering Correctness


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


Primary scope:
- server-seeded initial state
- neutral fallback
- phase-correct image preload
- shared tokens/components needed by all surfaces

Do not implement participant/live/admin visual redesign in this pass beyond what is necessary to establish reusable foundations.

Tasks:

1. Fix participant initial render:
   - resolve campaign/session/context server-side;
   - use `readSessionTokenFromCookies()` in Server Components;
   - pass initial state to client;
   - polling updates from truth.

2. Fix live initial render:
   - server-resolve `getPublicLiveSnapshot()`;
   - seed client;
   - no night/default false frame.

3. Add neutral branded fallback only for genuine unresolved state.

4. Preload only the initial phase image(s), not all live assets.

5. Normalize/reuse visual primitives:
   - EventLockup
   - StageHeader
   - PrimaryButton
   - ThemeCard
   - LensStatusCard
   - RankingRow
   - SharedPriorityCallout
   - Metric
   only where this reduces duplication without changing behavior.

Validation before finishing:
- hard refresh RESULTS and VOTING/COLLECTING where practical;
- participant 390/430;
- live 1920/1366;
- no false phase flash.

Do not change:
- event state machine;
- Supabase schema;
- AI logic;
- vote rules;
- locked narrative.

Return:
RESULT / files changed / root cause / browser validation / tests / commit / preview.
