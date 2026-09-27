# Mahni — admin access and rehearsal accounts

## Intended model

Conference admin uses the same mechanism as the rest of the ITT site:

1. Supabase Auth sign-in at `/admin/login`
2. A row in `public.staff` for that Auth user (`user_id`, `email`, `role` of `admin` or `editor`)
3. Session cookie via `src/lib/auth/session.ts` (`getAdminSession`, `requireRole`)

Mahni admin actions require at least the `editor` role.

## Rehearsal-only setup (preview)

For Vercel preview rehearsal, a temporary account may have been added manually in Supabase:

- Auth user: `mahni-rehearsal-admin@ittdigitalhub.org` (password set in Supabase Auth, not stored in repo)
- Matching `public.staff` row linking that Auth `user_id` with role `editor`

This is not a separate API backdoor; it is the normal staff table.

## Production safety

Before go-live, remove the rehearsal Auth user and its `staff` row **or** replace the email with a real team member’s staff account.

## Demo seed / reset

`MAHNI_ALLOW_DEMO_SEED`:

- **Vercel Preview:** may be `true` for rehearsal.
- **Vercel Production:** must be unset or `false`; `VERCEL_ENV=production` blocks demo seed regardless (`mahniDemoSeedAllowed()` in admin actions).
