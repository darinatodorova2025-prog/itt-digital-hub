# Audience Review Specification

**AI helps organize. The audience approves final themes.** Audience review stays inside **02 · Подреждаме**.

## Operator flow
Candidate themes become review-ready. Admin opens them one by one. Live/projector shows only current candidate. Presenter asks whether it correctly represents source ideas. Room responds verbally. Operator records consensus.

Primary admin actions:
- `ОДОБРЕНО ОТ ЗАЛАТА`
- `ТРЯБВА ДА СЕ РАЗДЕЛИ`

## Live/projector
Read-only presentation. Example: `5 идеи -> 1 обща тема`, title, short description, `5 предложения · 4 организации`, a few sanitized source excerpts, then `Това представя ли правилно тези идеи?`

No projector checkboxes, mutations, provider names, confidence scores or debug.

## Rejection
Only that theme returns to Sol with conservative split instruction, then JAV audit, then re-enters review queue. Operator should not manually rewrite during presentation.

## Single-idea themes
Show as `1 идея -> 1 тема`; do not imply AI merged anything.

## Approval persistence
Explicit status such as `pending`, `review_ready`, `approved`, `rework`, `audit_unavailable`. Theme existence is not approval. Only approved real themes are voting-ready.

## Transition
`ОТВОРИ ИЗБОРА` becomes available only when all final real themes are resolved/approved according to explicit rules.

Presenter framing: `ИИ ни помага да намерим общото между идеите. После проверяваме заедно дали сме ги подредили правилно.`
