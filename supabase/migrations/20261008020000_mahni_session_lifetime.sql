-- Keep a scanned phone recognized until the browser data is cleared.
create or replace function public.md_upsert_session(p_token_hash text, p_participant_id uuid)
returns void language plpgsql as $$
begin
  insert into public.md_participant_sessions (token_hash, participant_id, expires_at)
  values (p_token_hash, p_participant_id, now() + interval '400 days')
  on conflict (token_hash) do update
    set participant_id = excluded.participant_id,
        expires_at = excluded.expires_at;
end;
$$;
