# Current state to preserve

## Already good
- Critical clustering model is isolated as `gpt-6.1-sol`.
- Clustering uses OpenAI Responses.
- Provider/model trace exists.
- Timeout/retry behavior exists.
- Themes persist `sourceIdeas` and `formulationNote`.
- Deterministic coverage/unknown-ID/duplicate checks exist.
- Theme-to-idea lineage exists.
- Supabase clustering commit already uses an atomic RPC.
- Admin analysis status/retry exists.
- Review utilities exist for extract/combine.
- Campaign isolation and participant/session protections must remain.
- AI Jury / Втори поглед is separate and must remain untouched.

## Current weaknesses
1. Main path is still effectively `raw ideas -> one GPT call -> final themes`.
2. Semantic input does not fully use `role + frequency`.
3. Fixed theme-count pressure can force false merges.
4. `formulationNote` is traceability, not semantic validation.
5. Manual combine can force unrelated groups together.
6. Public review mutation routes must not remain anonymously mutable.
7. Raw participant ideas should not be freely exposed on live/public.
8. Review persistence should be atomic.
9. Zero ideas is an operator/state condition, not an AI failure.
10. Current review UI is an engineering prototype; projector review must be read-only and presentation-grade.

## Preserve unless necessary
Existing state machine, participant flow, voting rules, AI Jury, results, campaign history, auth/session model, admin shell and five-stage public narrative.
