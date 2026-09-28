# 08 — Acceptance / Visual QA Checklist

## Initialization
- hard refresh participant in RESULTS: no Welcome flash
- hard refresh participant in VOTING: no false phase
- hard refresh live RESULTS: no night/default flash
- hard refresh live VOTING: no wrong background
- neutral fallback only if state unknown

## Participant
- 390×844 checked
- 430px checked
- all 7 states inspected
- no horizontal overflow
- no clipped CTA
- no awkward Bulgarian wrapping
- vote count and states correct
- result official/AI hierarchy correct

## Live
- 1920×1080 all phases
- 1366×768 collecting/voting/result minimum
- QR readable
- ranking rows visible from distance
- countdown dominant
- photography visible
- text remains high contrast
- no small diagnostic text
- no overflow

## Admin
- 1440×900
- current phase obvious
- one next action
- scroll position stable during refresh
- technical details collapsed
- participant search works
- export visible
- demo controls separated

## Functional
- registration
- multiple ideas
- frequency
- grouping
- AI additional theme
- max 3 votes
- interest signal
- countdown
- second view
- results
- follow-up
- export
- demo reset/seed

## Tests
- typecheck
- lint
- feature tests
- build
- full check from clean feature state

## Visual diff method
For each screen:
1. open reference
2. open real render side-by-side
3. compare:
   - hierarchy
   - density
   - whitespace
   - crop
   - typography
   - alignment
   - visual weight
4. fix concrete mismatch
5. re-screenshot
