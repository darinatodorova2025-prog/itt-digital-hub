-- Persist the idea texts and formulation note behind each combined theme.

alter table public.md_themes
  add column if not exists formulation_note text not null default '',
  add column if not exists source_ideas jsonb not null default '[]'::jsonb;

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

  for v_theme in select * from jsonb_array_elements(p_themes)
  loop
    v_sources := case
      when jsonb_typeof(v_theme->'sourceIdeas') = 'array' then v_theme->'sourceIdeas'
      else '[]'::jsonb
    end;

    insert into public.md_themes (
      campaign_id, analysis_run_id, title, description, is_ai_wildcard, sort_order, idea_count, organization_count,
      formulation_note, source_ideas
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
      v_sources
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
    formulation_note, source_ideas
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
    '[]'::jsonb
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
