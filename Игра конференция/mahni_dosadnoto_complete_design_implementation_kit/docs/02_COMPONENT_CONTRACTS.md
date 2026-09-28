# 02 — Component Contracts

These are visual/interaction contracts, not mandatory filenames.

## EventLockup
Purpose: authentic ITT Digital Hub identity.
Must reuse repository asset/component.
Never redraw from screenshots.

## StageHeader
Contains:
- back control where relevant;
- `NN / 05 · Stage`;
- compact 5-part progress indicator.
Mobile-first.

## PrimaryButton
- full-width on participant mobile;
- signal blue;
- strong contrast;
- single dominant CTA per screen.

States:
default / hover / focus / disabled / loading.

## SecondaryTextAction
For:
- “Имаме подобен проблем и при нас”
- “Към следващата стъпка”
- quiet follow-up links.

Never compete with PrimaryButton.

## ThemeCard
Contains:
- optional thumbnail;
- theme title;
- optional metadata;
- selection affordance;
- optional interest action.

States:
default / selected / voted / disabled.

## LensStatusCard
Three canonical lenses:
- Бизнес стойност
- Реализируемост
- Нови възможности

States:
pending / active / succeeded / failed-internal.

Public surface must never show raw provider errors.

## ThemeEquation
Visualizes:
many ideas → grouped themes → +1 additional AI theme.

Must work in:
- participant light version;
- live dark version.

## RankingRow
Used for live voting and results.
Contains:
rank / title / optional progress / count.
Strong alignment and tabular numerals.

## SharedPriorityCallout
Used in results.
Text:
- Един общ приоритет
- Два общи приоритета
- Три общи приоритета

Must communicate convergence, not competition.

## Metric
Large value + compact label + optional outline icon.

## AdminPhaseCard
Shows:
- current phase;
- concise note;
- one recommended next action.

## AdminStatusPanel
Operational status only.
Technical errors collapsed.

## AdminDataTable
Searchable where appropriate.
Horizontally scrollable on smaller widths.
Must not cause full-page horizontal overflow.
