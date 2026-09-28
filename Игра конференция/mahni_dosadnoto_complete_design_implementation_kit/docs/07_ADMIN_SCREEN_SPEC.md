# 07 — Admin Control Room Specification

Target:
1440×900 typical laptop.

Purpose:
operator safety and clarity.

## Layout

Left navigation:
- Махни досадното
- Контролна зала
- Участници
- Теми
- Организации
- Експорт
- back to site

Main:
1. event active state
2. current phase
3. one recommended next action
4. five-stage overview
5. metrics
6. AI status
7. top themes/results
8. participant/contact/theme data
9. rehearsal/demo
10. export

## Current phase

Use human-readable Bulgarian phase.

Primary action:
only one visually dominant recommended next action.

Dangerous actions:
confirm-gated.

## Metrics

Participants
Organizations
Ideas
Votes
Follow-up requests

Compact row.
Outline icons.
No decorative oversized cards.

## AI status

Analysis:
complete/in progress.

Lenses:
business value / feasibility / new opportunities.

Technical diagnostics:
collapsed.

## Tables

Participant:
searchable.

Organizations/contact:
follow-up oriented.

Themes:
rank / title / idea count / organization count.

Export:
clear CSV action.

## Polling

No periodic full-document `window.location.reload()` if a safe in-place refetch can be used.
Preserve scroll position.

## Demo / rehearsal

Clearly separated from live controls.
Never visually mix destructive demo actions with normal event actions.
