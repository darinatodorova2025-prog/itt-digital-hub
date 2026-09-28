# 00 — Handoff Context

## Product

„Махни досадното“ е интерактивно конференционно преживяване на ITT Digital Hub.

Целта е:
реален проблем → структуриране → човешки приоритет → независим втори поглед от ИИ → действие.

## Locked narrative

1. Споделяме
2. Подреждаме
3. Избираме
4. Втори поглед
5. От резултат към действие

Никога:
- „ХОРАТА vs ИИ“
- battle framing
- winner framing
- public “AI Wildcard”

Public term:
- „Допълнителна идея от ИИ“

Official result:
- „Изборът на участниците“

Secondary:
- „Независим поглед от ИИ“

## Surfaces

Participant:
`/bg/mahni-dosadnoto`

Live:
`/bg/mahni-dosadnoto/live`

Admin:
`/admin/mahni-dosadnoto`

## Current known blocker

Initial-state flicker:
- participant може първо да покаже Welcome и после реалната фаза;
- live може първо да покаже night/default и после реалната фаза.

Desired architecture:
server-seeded initial state → correct first meaningful render → client polling updates.

В Server Component използвайте `readSessionTokenFromCookies()`, не `readSessionTokenFromRequest()`.

## Locked foundations

Да не се преосмислят:
- product narrative;
- phase mapping;
- official human ranking;
- AI as secondary lens;
- Source Serif + IBM Plex Sans;
- current outline-icon family;
- original ITT lockup from repo;
- Supabase schema;
- voting rules;
- AI/Jury logic;
- event state machine;
- security/auth;
- ViK Projectant.

## Work method

Всеки implementation pass трябва да е:
READ → IMPLEMENT SMALL SCOPE → OPEN REAL PREVIEW → SCREENSHOT → COMPARE → FIX → TEST.

Не преминавайте към следващ surface, ако текущият още е видимо далеч от reference.
