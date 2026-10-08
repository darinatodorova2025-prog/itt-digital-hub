-- Audience review state, approved-only votes, and atomic review replacement.

alter table public.md_themes
  add column if not exists review_status text not null default 'pending',
  add column if not exists audit_record jsonb,
  add column if not exists audit_override jsonb;

alter table public.md_themes
  drop constraint if exists md_themes_review_status_check;

alter table public.md_themes
  add constraint md_themes_review_status_check
  check (review_status in ('pending', 'review_ready', 'approved', 'rework', 'audit_unavailable'));

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
  v_sources jsonb;
begin
  select campaign_id, status into v_campaign_id, v_status
  from public.md_analysis_runs where id = p_run_id for update;

  if not found then
    raise exception 'run_not_found';
  end if;
  if v_status not in ('pending', 'running') then
    raise exception 'run_not_running';
  end if;

  delete from public.md_themes where campaign_id = v_campaign_id;

  for v_theme in select * from jsonb_array_elements(p_themes)
  loop
    v_sources := case
      when jsonb_typeof(v_theme->'sourceIdeas') = 'array' then v_theme->'sourceIdeas'
      else '[]'::jsonb
    end;

    insert into public.md_themes (
      campaign_id, analysis_run_id, title, description, is_ai_wildcard, sort_order, idea_count, organization_count,
      formulation_note, source_ideas, review_status, audit_record
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
      ),
      coalesce(v_theme->>'formulationNote', ''),
      v_sources,
      coalesce(v_theme->>'reviewStatus', 'review_ready'),
      v_theme->'audit'
    )
    returning id into v_theme_id;

    for v_idea_id in select jsonb_array_elements_text(v_theme->'ideaIds')::uuid
    loop
      insert into public.md_theme_idea_links (theme_id, idea_id) values (v_theme_id, v_idea_id);
    end loop;

    v_sort := v_sort + 1;
  end loop;

  insert into public.md_themes (
    campaign_id, analysis_run_id, title, description, is_ai_wildcard, sort_order, idea_count, organization_count,
    formulation_note, source_ideas, review_status
  )
  values (
    v_campaign_id,
    p_run_id,
    p_wildcard->>'title',
    p_wildcard->>'description',
    true,
    v_sort,
    0,
    0,
    coalesce(p_wildcard->>'formulationNote', ''),
    '[]'::jsonb,
    'pending'
  );

  update public.md_analysis_runs
  set status = 'succeeded',
      provider = p_provider,
      model = p_model,
      stage = 'complete',
      finished_at = now()
  where id = p_run_id;

  perform public.md_audit(v_campaign_id, 'analysis_succeeded', jsonb_build_object('run_id', p_run_id, 'model', p_model));
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
  v_participant_campaign uuid;
  v_theme_campaign uuid;
  v_vote_id uuid;
  v_existing uuid;
  v_used integer;
  v_approved boolean;
begin
  v_participant_id := public.md_resolve_participant_id(p_token_hash);
  if v_participant_id is null then
    raise exception 'unauthorized';
  end if;

  select campaign_id into v_participant_campaign from public.md_participants where id = v_participant_id;
  select campaign_id into v_theme_campaign from public.md_themes where id = p_theme_id;
  if v_theme_campaign is null or v_participant_campaign is distinct from v_theme_campaign then
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

  select (is_ai_wildcard = false and review_status = 'approved') into v_approved
  from public.md_themes where id = p_theme_id;
  if v_approved is distinct from true then
    raise exception 'invalid_theme';
  end if;

  insert into public.md_votes (campaign_id, participant_id, theme_id)
  select t.campaign_id, v_participant_id, p_theme_id
  from public.md_themes t
  where t.id = p_theme_id
    and t.is_ai_wildcard = false
    and t.review_status = 'approved'
  returning id into v_vote_id;

  if v_vote_id is null then
    raise exception 'invalid_theme';
  end if;

  if p_idempotency_scope is not null and p_idempotency_scope <> '' then
    insert into public.md_idempotency_keys (scope, resource_id) values (p_idempotency_scope, v_vote_id);
  end if;

  select count(*)::integer into v_used from public.md_votes where participant_id = v_participant_id;
  return jsonb_build_object('vote_id', v_vote_id, 'votes_used', v_used, 'duplicate', false);
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

  if p_to = 'VOTING' then
    if not exists (
      select 1 from public.md_themes t
      where t.campaign_id = row.id and t.is_ai_wildcard = false
    ) or exists (
      select 1 from public.md_themes t
      where t.campaign_id = row.id
        and t.is_ai_wildcard = false
        and t.review_status is distinct from 'approved'
    ) then
      raise exception 'review_open';
    end if;
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

create or replace function public.md_set_theme_review(
  p_theme_id uuid,
  p_campaign_id uuid,
  p_status text,
  p_override jsonb
)
returns void language plpgsql as $$
declare
  v_theme public.md_themes;
begin
  select * into v_theme from public.md_themes where id = p_theme_id for update;
  if not found or v_theme.campaign_id is distinct from p_campaign_id or v_theme.is_ai_wildcard then
    raise exception 'invalid_theme';
  end if;
  if p_status = 'approved' and v_theme.review_status is distinct from 'review_ready' then
    raise exception 'not_review_ready';
  end if;
  if p_status = 'review_ready' and v_theme.review_status = 'audit_unavailable' and p_override is null then
    raise exception 'not_override';
  end if;
  update public.md_themes
  set review_status = p_status,
      audit_override = case when p_override is null then audit_override else p_override end
  where id = p_theme_id;
end;
$$;

create or replace function public.md_replace_review_themes(
  p_campaign_id uuid,
  p_remove_ids uuid[],
  p_themes jsonb
)
returns void language plpgsql as $$
declare
  v_phase public.md_event_phase;
  v_theme jsonb;
  v_theme_id uuid;
  v_idea_id uuid;
  v_sources jsonb;
begin
  select phase into v_phase from public.md_event_campaigns where id = p_campaign_id for update;
  if v_phase is distinct from 'ANALYZING' then
    raise exception 'not_analyzing';
  end if;

  if exists (
    select 1 from public.md_themes t
    where t.id = any(p_remove_ids) and t.campaign_id is distinct from p_campaign_id
  ) then
    raise exception 'invalid_theme';
  end if;

  delete from public.md_themes
  where campaign_id = p_campaign_id
    and id = any(p_remove_ids);

  for v_theme in select * from jsonb_array_elements(p_themes)
  loop
    v_theme_id := (v_theme->>'id')::uuid;
    v_sources := case
      when jsonb_typeof(v_theme->'sourceIdeas') = 'array' then v_theme->'sourceIdeas'
      else '[]'::jsonb
    end;

    if exists (select 1 from public.md_themes where id = v_theme_id and campaign_id is distinct from p_campaign_id) then
      raise exception 'invalid_theme';
    end if;

    insert into public.md_themes (
      id, campaign_id, analysis_run_id, title, description, is_ai_wildcard, sort_order, idea_count, organization_count,
      formulation_note, source_ideas, review_status, audit_record
    )
    values (
      v_theme_id,
      p_campaign_id,
      (v_theme->>'analysisRunId')::uuid,
      v_theme->>'title',
      v_theme->>'description',
      coalesce((v_theme->>'isAiWildcard')::boolean, false),
      coalesce((v_theme->>'sortOrder')::integer, 0),
      coalesce(jsonb_array_length(v_theme->'ideaIds'), 0),
      (
        select count(distinct lower(trim(i.organization)))
        from public.md_ideas i
        where i.campaign_id = p_campaign_id
          and i.id in (select jsonb_array_elements_text(coalesce(v_theme->'ideaIds', '[]'::jsonb))::uuid)
      ),
      coalesce(v_theme->>'formulationNote', ''),
      v_sources,
      coalesce(v_theme->>'reviewStatus', 'review_ready'),
      v_theme->'audit'
    )
    on conflict (id) do update set
      title = excluded.title,
      description = excluded.description,
      is_ai_wildcard = excluded.is_ai_wildcard,
      sort_order = excluded.sort_order,
      idea_count = excluded.idea_count,
      organization_count = excluded.organization_count,
      formulation_note = excluded.formulation_note,
      source_ideas = excluded.source_ideas,
      review_status = excluded.review_status,
      audit_record = excluded.audit_record;

    delete from public.md_theme_idea_links where theme_id = v_theme_id;
    for v_idea_id in select jsonb_array_elements_text(coalesce(v_theme->'ideaIds', '[]'::jsonb))::uuid
    loop
      if not exists (
        select 1 from public.md_ideas i where i.id = v_idea_id and i.campaign_id = p_campaign_id
      ) then
        raise exception 'invalid_theme';
      end if;
      insert into public.md_theme_idea_links (theme_id, idea_id) values (v_theme_id, v_idea_id);
    end loop;
  end loop;
end;
$$;
