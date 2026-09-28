# Rehearsal — Махни досадното

## Prerequisites

- `npm run dev` locally, or a Vercel preview with env vars: `AI_PROVIDER`, model keys, optional `SUPABASE_SERVICE_ROLE_KEY` after migration.
- Admin login at `/admin/login`.
- For demo seed on Vercel preview only: `MAHNI_ALLOW_DEMO_SEED=true` (Preview scope only — never Production).

## Full stage rehearsal

1. **Seed demo data** — Admin → „Махни досадното“ → „Seed demo data“ (40 participants, ~120 ideas, demo flag).
2. **Start collection** — „Старт събиране“ → phase `COLLECTING`.
3. **Manual submit** — Open `/bg/mahni-dosadnoto` on a phone, register, submit 2+ ideas.
4. **Close collection** — Admin „Затвори събиране“ → `ANALYZING`.
5. **Run AI clustering** — „Стартирай AI анализ“ (requires configured AI keys). Inspect themes in admin.
6. **Open voting** — „Отвори гласуване“ → `VOTING`. Live screen at `/bg/mahni-dosadnoto/live`.
7. **Simulate votes** — Multiple browsers or demo participants; each max 3 votes.
8. **Final countdown** — „Финален отброяване“ (~45s). Live shows countdown.
9. **Close human voting** — Wait for auto-advance after countdown or press „Затвори гласуване“ → locks human result → `AI_JURY`.
10. **Run AI Jury** — „AI Jury“ (3 independent judges). Admin shows `2/3 AI judges complete` until all succeed. Use **Retry failed AI judges** after rate limits; „Покажи резултат“ stays disabled until 3/3.
11. **Reveal** — „Покажи резултата“ → `RESULTS`. Live shows „Какво излезе напред“: participant priorities first, independent AI perspective second.
12. **Reset demo** — „Reset demo only“ (never deletes non-demo production data).

## QR code for production cards

```bash
npx tsx scripts/mahni-dosadnoto-qr.ts
```

Output: `public/event/mahni-dosadnoto-qr.svg` pointing to `https://ittdigitalhub.org/bg/mahni-dosadnoto`.
