# PROMPT 16 — Release Readiness Only

Repository: https://github.com/darinatodorova2025-prog/itt-digital-hub
Branch: `feature/mahni-dosadnoto`

Do not redesign.

Goal:
determine whether the feature is safe to merge/deploy.

1. inspect git status;
2. isolate unrelated working-tree changes;
3. run full checks from clean feature state;
4. verify PR mergeability/conflicts;
5. verify preview routes;
6. verify no missing env/runtime dependency;
7. confirm migrations/env are already applied as expected;
8. confirm production URLs to be used after merge.

Do NOT merge or deploy production without explicit approval.

Return:
- READY TO MERGE / BLOCKED
- exact blocker if any
- test results
- PR state
- clean commit hash
- manual steps required (expected none).
