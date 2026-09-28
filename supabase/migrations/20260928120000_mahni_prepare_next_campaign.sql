-- Archive a closed campaign under a new slug and open a clean current campaign.
-- Historical rows stay attached to the archived campaign id.

create or replace function public.md_prepare_next_campaign(p_slug text, p_is_demo boolean)
returns public.md_event_campaigns
language plpgsql
as $$
declare
  current_row public.md_event_campaigns;
  created public.md_event_campaigns;
  archived_slug text;
begin
  select * into current_row
  from public.md_event_campaigns
  where slug = p_slug
  for update;

  if not found then
    raise exception 'campaign_not_found';
  end if;
  if current_row.phase is distinct from 'CLOSED' then
    raise exception 'not_closed';
  end if;

  archived_slug := p_slug || '--' || substr(current_row.id::text, 1, 8);
  update public.md_event_campaigns
    set slug = archived_slug,
        updated_at = now()
    where id = current_row.id;

  insert into public.md_event_campaigns (slug, title, phase, is_demo, show_recent_ideas)
  values (p_slug, current_row.title, 'DRAFT', p_is_demo, true)
  returning * into created;

  perform public.md_audit(created.id, 'campaign_prepared', jsonb_build_object('archived_id', current_row.id, 'is_demo', p_is_demo));
  return created;
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
end;
$$;
