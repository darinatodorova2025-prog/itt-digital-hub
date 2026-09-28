# Махни досадното — Design Implementation Kit

Този пакет е работната спецификация за финалното UI/UX изпълнение на „Махни досадното“.

Repo: https://github.com/darinatodorova2025-prog/itt-digital-hub
Branch: `feature/mahni-dosadnoto`
Preview: https://itt-digital-hub-git-fe-607b43-darinatodorova2025-6319s-projects.vercel.app

## Как да се използва

Не давайте на AI агента един огромен prompt за всичко.

Работете последователно:

1. `docs/00_HANDOFF_CONTEXT.md`
2. `docs/01_MASTER_VISUAL_SPEC.md`
3. `docs/02_COMPONENT_CONTRACTS.md`
4. `docs/03_STATE_LOADING_SPEC.md`
5. `docs/04_ASSET_MAP.md`
6. съответната screen specification
7. съответния prompt от `prompts/`

Препоръчителен ред:
1. foundation
2. participant
3. live
4. admin
5. final polish / regression
6. release readiness

## Source-of-truth hierarchy

Когато има конфликт между материали:

1. Реалната продуктова логика и динамичните данни в repo са source of truth за behavior/data.
2. `references/master_concept_board.png` + exact crops са source of truth за narrative/layout hierarchy.
3. Latest standalone mockups са reference за finish, density, spacing и visual treatment.
4. Генериран текст вътре в image reference НЕ е source of truth. Ползвайте заключените текстове от screen specs / production copy.
5. Оригиналният logo/component от repo е source of truth за ITT Digital Hub branding.

## Златно правило

Reference image = visual specification, не bitmap за копиране.

Агентът трябва да изгради реални responsive компоненти, не да поставя screenshots като UI.
