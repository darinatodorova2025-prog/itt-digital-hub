-- Махни досадното — RPC, integrity triggers, concurrent-safe voting

create or replace function public.md_audit(p_campaign_id uuid, p_action text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql as $$
begin
  insert into public.md_event_audit_log (campaign_id, action, detail)
  values (p_campaign_id, p_action, p_detail);
end;
$$;

create or replace function public.md_resolve_participant_id(p_token_hash text)
returns uuid language sql stable as $$
  select s.participant_id
  from public.md_participant_sessions s
  where s.token_hash = p_token_hash and s.expires_at > now()
  limit 1;
$$;

create or replace function public.md_upsert_session(p_token_hash text, p_participant_id uuid)
returns void language plpgsql as $$
begin
  insert into public.md_participant_sessions (token_hash, participant_id, expires_at)
  values (p_token_hash, p_participant_id, now() + interval '2 days')
  on conflict (token_hash) do update
    set participant_id = excluded.participant_id,
        expires_at = excluded.expires_at;
end;
$$;

create or replace function public.md_enforce_idea_collecting()
returns trigger language plpgsql as $$
declare
  campaign_phase public.md_event_phase;
begin
  select c.phase into campaign_phase
  from public.md_event_campaigns c
  where c.id = new.campaign_id;
  if campaign_phase is distinct from 'COLLECTING' then
    raise exception 'not_collecting';
  end if;
  return new;
end;
$$;

drop trigger if exists md_ideas_collecting_trg on public.md_ideas;
create trigger md_ideas_collecting_trg
  before insert on public.md_ideas
  for each row execute function public.md_enforce_idea_collecting();

create or replace function public.md_submit_idea(
  p_token_hash text,
  p_body text,
  p_frequency text,
  p_idempotency_scope text
)
returns jsonb language plpgsql as $$
declare
  v_participant_id uuid;
  v_idea_id uuid;
  v_existing uuid;
begin
  v_participant_id := public.md_resolve_participant_id(p_token_hash);
  if v_participant_id is null then
    raise exception 'unauthorized';
  end if;

  if p_idempotency_scope is not null and p_idempotency_scope <> '' then
    select resource_id into v_existing from public.md_idempotency_keys where scope = p_idempotency_scope;
    if v_existing is not null then
      return jsonb_build_object('idea_id', v_existing, 'duplicate', true);
    end if;
  end if;

  insert into public.md_ideas (campaign_id, participant_id, organization, role, body, frequency, is_demo)
  select p.campaign_id, p.id, p.organization, p.role, left(trim(p_body), 4000), nullif(trim(p_frequency), ''), p.is_demo
  from public.md_participants p
  where p.id = v_participant_id
  returning id into v_idea_id;

  if p_idempotency_scope is not null and p_idempotency_scope <> '' then
    insert into public.md_idempotency_keys (scope, resource_id) values (p_idempotency_scope, v_idea_id);
  end if;

  return jsonb_build_object('idea_id', v_idea_id, 'duplicate', false);
end;
$$;

create or replace function public.md_cast_vote(
  p_token_hash text,
  p_theme_id uuid,
  p_idempotency_scope text
)
returns jsonb language plpgsql as $$
declare
  v_participant_id uuid;
  v_vote_id uuid;
  v_existing uuid;
  v_used integer;
begin
  v_participant_id := public.md_resolve_participant_id(p_token_hash);
  if v_participant_id is null then
    raise exception 'unauthorized';
  end if;

  perform 1 from public.md_participants where id = v_participant_id for update;

  if p_idempotency_scope is not null and p_idempotency_scope <> '' then
    select resource_id into v_existing from public.md_idempotency_keys where scope = p_idempotency_scope;
    if v_existing is not null then
      select count(*)::integer into v_used from public.md_votes where participant_id = v_participant_id;
      return jsonb_build_object('vote_id', v_existing, 'votes_used', v_used, 'duplicate', true);
    end if;
  end if;

  select id into v_vote_id from public.md_votes
  where participant_id = v_participant_id and theme_id = p_theme_id;
  if v_vote_id is not null then
    select count(*)::integer into v_used from public.md_votes where participant_id = v_participant_id;
    return jsonb_build_object('vote_id', v_vote_id, 'votes_used', v_used, 'duplicate', true);
  end if;

  insert into public.md_votes (campaign_id, participant_id, theme_id)
  select t.campaign_id, v_participant_id, p_theme_id
  from public.md_themes t
  where t.id = p_theme_id
  returning id into v_vote_id;

  if v_vote_id is null then
    raise exception 'invalid_theme';
  end if;

  if p_idempotency_scope is not null and p_idempotency_scope <> '' then
    insert into public.md_idempotency_keys (scope, resource_id) values (p_idempotency_scope, v_vote_id);
  end if;

  select count(*)::integer into v_used from public.md_votes where participant_id = v_participant_id;
  return jsonb_build_object('vote_id', v_vote_id, 'votes_used', v_used, 'duplicate', false);
exception
  when others then
    if sqlerrm in ('not_voting', 'vote_limit', 'voting_closed') then
      raise;
    end if;
    raise;
end;
$$;

create or replace function public.md_transition_phase(
  p_slug text,
  p_to public.md_event_phase,
  p_voting_ends_at timestamptz default null
)
returns public.md_event_campaigns language plpgsql as $$
declare
  row public.md_event_campaigns;
  allowed boolean := false;
begin
  select * into row from public.md_event_campaigns where slug = p_slug for update;
  if not found then
    raise exception 'campaign_not_found';
  end if;

  if row.phase = p_to then
    return row;
  end if;

  allowed := (
    (row.phase = 'DRAFT' and p_to = 'COLLECTING') or
    (row.phase = 'COLLECTING' and p_to = 'ANALYZING') or
    (row.phase = 'ANALYZING' and p_to = 'VOTING') or
    (row.phase = 'VOTING' and p_to = 'FINALIZING') or
    (row.phase = 'FINALIZING' and p_to = 'AI_JURY') or
    (row.phase = 'AI_JURY' and p_to = 'RESULTS') or
    (row.phase = 'RESULTS' and p_to = 'CLOSED')
  );

  if not allowed then
    raise exception 'invalid_transition';
  end if;

  update public.md_event_campaigns
  set phase = p_to,
      voting_ends_at = case when p_voting_ends_at is not null then p_voting_ends_at else voting_ends_at end,
      updated_at = now()
  where id = row.id
  returning * into row;

  perform public.md_audit(row.id, 'phase_transition', jsonb_build_object('to', p_to));

  return row;
end;
$$;

create or replace function public.md_maybe_advance_finalizing(p_campaign_id uuid)
returns public.md_event_campaigns language plpgsql as $$
declare
  row public.md_event_campaigns;
begin
  select * into row from public.md_event_campaigns where id = p_campaign_id for update;
  if row.phase = 'FINALIZING' and row.voting_ends_at is not null and row.voting_ends_at <= now() then
    update public.md_event_campaigns
    set human_result_locked_at = coalesce(human_result_locked_at, now()),
        phase = 'AI_JURY',
        updated_at = now()
    where id = p_campaign_id
    returning * into row;
    perform public.md_audit(row.id, 'voting_auto_closed', '{}'::jsonb);
  end if;
  return row;
end;
$$;

create or replace function public.md_commit_clustering(
  p_run_id uuid,
  p_provider text,
  p_model text,
  p_themes jsonb,
  p_wildcard jsonb
)
returns void language plpgsql as $$
declare
  v_campaign_id uuid;
  v_status public.md_ai_run_status;
  v_theme jsonb;
  v_theme_id uuid;
  v_sort integer := 0;
  v_idea_id uuid;
begin
  select campaign_id, status into v_campaign_id, v_status
  from public.md_analysis_runs where id = p_run_id for update;

  if not found then
    raise exception 'run_not_found';
  end if;
  if v_status not in ('pending', 'running') then
    raise exception 'run_not_running';
  end if;

  for v_theme in select * from jsonb_array_elements(p_themes)
  loop
    insert into public.md_themes (
      campaign_id, analysis_run_id, title, description, is_ai_wildcard, sort_order, idea_count, organization_count
    )
    values (
      v_campaign_id,
      p_run_id,
      v_theme->>'title',
      v_theme->>'description',
      false,
      v_sort,
      jsonb_array_length(v_theme->'ideaIds'),
      (
        select count(distinct lower(trim(i.organization)))
        from public.md_ideas i
        where i.id in (select jsonb_array_elements_text(v_theme->'ideaIds')::uuid)
      )
    )
    returning id into v_theme_id;

    for v_idea_id in select jsonb_array_elements_text(v_theme->'ideaIds')::uuid
    loop
      insert into public.md_theme_idea_links (theme_id, idea_id) values (v_theme_id, v_idea_id);
    end loop;

    v_sort := v_sort + 1;
  end loop;

  insert into public.md_themes (
    campaign_id, analysis_run_id, title, description, is_ai_wildcard, sort_order, idea_count, organization_count
  )
  values (
    v_campaign_id,
    p_run_id,
    p_wildcard->>'title',
    p_wildcard->>'description',
    true,
    v_sort,
    0,
    0
  );

  update public.md_analysis_runs
  set status = 'succeeded',
      provider = p_provider,
      model = p_model,
      stage = 'complete',
      finished_at = now()
  where id = p_run_id;

  perform public.md_audit(v_campaign_id, 'analysis_succeeded', jsonb_build_object('run_id', p_run_id));
end;
$$;

create index if not exists md_votes_participant_idx on public.md_votes (participant_id);
create index if not exists md_followup_campaign_idx on public.md_followup_requests (campaign_id, created_at desc);
create index if not exists md_analysis_runs_campaign_idx on public.md_analysis_runs (campaign_id, created_at desc);
