# Security and Data Rules

## Public/live
Presentation-only. Anonymous/public clients cannot extract, merge, split, approve, reject, reorder or mutate clustering state.

## Admin mutations
Require existing normal staff/editor auth. No hidden bypass.

## Raw ideas
Original raw participant text stays preserved. Admin may see it. Public live uses sanitized excerpts. At minimum redact detected person names, email, phone and explicit organization identity when unnecessary. Do not overwrite raw evidence.

## Organization
Not a semantic signal. May be used post-clustering for organizationCount, follow-up, analytics and winner logic.

## Atomicity
Merge/split/approval must be one logical transaction/RPC where practical. No partial themes/links/review state.

## Campaign isolation
Reject cross-campaign source/theme/review IDs.

## Public errors
Never expose raw provider/API errors on participant/live. Admin may show concise message with collapsed technical detail.
