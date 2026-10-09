# ITT Digital Hub — Repository Instructions

Independent website of ITT Digital Hub, an applied AI consultancy. Bilingual BG/EN, Next.js App Router, TypeScript, Tailwind CSS v4, static-first. Primary use: networking at AI Industrial Summit 2026.

## Authority order
1. The ITT Digital Hub goal prompt and confirmed project decisions.
2. `docs/ITT_TRANSFORMATION_MAP.md` and this file.
3. The reused design system in `src/app/globals.css` and `src/components/`.
4. Agent inference.

Never edit the original CIT repository, remotes, Vercel project, or deployments.

## Core idea
Business understanding × systems thinking × AI engineering. Process first. AI where it makes sense. Build what we recommend. AI is a capability, not the product.

## Content truth
Never invent names, clients, metrics, permissions, logos, emails, or results. Use TODO_CONTENT / TODO_VERIFY / TODO_ASSET / TODO_PERMISSION. Do not label organisations as clients unless confirmed. Do not carry CIT, UASG, ASAESIS, news, or academic-centre identity into the public ITT site.

## Information architecture
Nav: Work · What we solve · Approach · Tools · About · Contact · BG/EN.
Homepage: Hero → Experience across → Selected work → Problems → AI isn’t always the answer → How we work → Team → Contact.

## Product surfaces
This repository is one website and one Vercel project. AI Act Assistant, Settlement Analyzer, and later tools are surfaces of the same site — not separate apps, remotes, or deployments.

Live routes:
- `/[locale]/ai-act-agent` — `src/components/ai-act-agent/`, `src/lib/ai-act/`, `src/content/ai-act-*`
- `/[locale]/settlement-analyzer` — `src/settlement-analyzer/`
- `/[locale]/tools` — catalogue of those surfaces

New products follow the same pattern: App Router page under `src/app/[locale]/<product>/`, module under `src/`, copy in `src/content/`, same design system, same `npm run check`.

`Tools/Land Scope` is in-tree source for the analyzer. The public product is `src/settlement-analyzer/`. Do not split it into another repo, Vercel project, or ignore file.

## Engineering
- Page files compose; reusable components stay in `src/components/`.
- Copy lives in `src/content/`. No invented facts in components.
- Server components by default.
- Official logo assets live in `public/brand/itt-*.png`. Swap header/footer artwork in `src/components/layout/Logo.tsx` only.

## Quality
`npm run check` must pass. Verify 1440, 1280, 768, and 390 viewports. Bulgarian wrapping independently of English.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
