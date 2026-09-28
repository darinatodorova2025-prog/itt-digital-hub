# 03 — State, Loading and Transition Specification

## Principle

Never render a false event phase.

Unknown state is not Welcome.
Unknown state is not Collecting.
Unknown state is not Night scene.

## Initial render

Preferred architecture:
server-resolved current state
→ seed client component
→ hydrate
→ continue polling/refetching.

### Participant
Server resolves:
- campaign;
- session cookie;
- participant context;
- current phase.

Use:
`readSessionTokenFromCookies()` inside Server Components.

### Live
Server resolves:
- public live snapshot;
- current phase.

## Neutral fallback

Participant:
- authentic lockup;
- “Махни досадното”;
- paper background;
- restrained loading indicator.

Live:
- authentic lockup;
- plain navy;
- restrained loading indicator.

No phase-specific content/image.

## Polling

Polling updates a known state.
Polling must not be responsible for discovering the first meaningful state after a guessed render.

## Phase transitions

Transition may fade/change content after real phase update.
Never use animation to hide incorrect state.

## Public error handling

Participant/live:
- human-readable;
- no raw provider names;
- no stack traces;
- no Zod/provider/API details.

Admin:
technical detail may exist inside collapsed diagnostics.

## Image loading

Preload only image(s) needed for actual initial phase.
Do not preload all live scene images blindly.
Participant mobile must not download desktop-only live assets.

## Empty states

No ideas:
explain that collection is still in progress.

No ranking yet:
show phase-appropriate waiting state.

AI second view incomplete:
show three lens statuses.

## Results gating

Results are not shown as final until required business logic says they are final.
Do not fake complete AI lens state.
