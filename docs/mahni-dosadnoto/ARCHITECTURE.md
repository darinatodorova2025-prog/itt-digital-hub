# Махни досадното — architecture note

## Audit summary (existing ITT Digital Hub)

| Area | Existing pattern | Reuse for this event |
|------|------------------|----------------------|
| Routing | `src/proxy.ts` prefixes `/bg`, `/en`; product pages under `src/app/[locale]/<slug>/` | `/bg/mahni-dosadnoto` and `/live` as nested routes; admin under `src/app/admin/(console)/` |
| Locale | `src/lib/i18n.ts`, BG-first | Bulgarian-only participant copy; no EN surface unless locale layout requires it |
| Design | `globals.css`, `ButtonLink`, `Section`, settlement `styles.css` pattern | Dedicated `src/mahni-dosadnoto/styles.css`; ITT tokens; event layout without full marketing chrome on mobile |
| Admin auth | Supabase password + `staff` table or local dev password; HMAC cookie via `src/lib/auth/session.ts` | Same `getAdminSession()` gate for `/admin/mahni-dosadnoto` and admin API/actions |
| Supabase | Anon SSR client + migrations in `supabase/migrations/`; settlement uses RPC + anon | New migration with RLS; server writes via service-role client (server-only env); public reads via sanitized API routes |
| Sessions (products) | Settlement: HttpOnly cookies + Supabase RPC bootstrap | New opaque token + SHA-256 hash in `participant_sessions`; cookie `md_session` |
| AI | `readAiActConfig`, Google/OpenAI providers in `src/lib/ai-act/` | Dedicated batch modules in `src/mahni-dosadnoto/ai/`; env-driven model; structured JSON + Zod |
| Tests | Vitest in `tests/` | `tests/mahni-dosadnoto/` with in-memory store |
| Deploy | Vercel, `npm run check` | Same pipeline; migration applied manually before event |

## New components

- **Domain module** `src/mahni-dosadnoto/`: state machine, validation, tie-break, jury aggregation, sanitization, store interface.
- **Persistence** `supabase/migrations/*_mahni_dosadnoto.sql` + optional in-memory store for tests/local without Supabase.
- **HTTP** `src/app/api/mahni-dosadnoto/*` — participant, live (public DTOs), admin (session-checked).
- **UI** participant app, `/live` presentation, admin dashboard, CSV export.
- **Scripts** demo seed, demo reset (guarded), QR generator for production URL.
- **Docs** `REHEARSAL.md` for stage rehearsal.

## Explicit non-goals

- No changes to AI Act, ВиК Проектант, or Settlement Analyzer behavior.
- No English participant UI in v1.
- No manual semantic editing of committed AI clustering in production admin.

## Public URLs (canonical)

- Participant: `https://ittdigitalhub.org/bg/mahni-dosadnoto`
- Live: `https://ittdigitalhub.org/bg/mahni-dosadnoto/live`
- Admin: `https://ittdigitalhub.org/admin/mahni-dosadnoto`
