-- Settlement Analyzer Beta trial, feedback, and product intelligence.
-- Public visitors cannot read or write these tables. The Next.js server uses the service role.
-- Trial slots are reserved in the database so a client-side counter cannot extend the Beta.

create table if not exists public.sa_beta_settings (
  id integer primary key default 1 check (id = 1),
  feedback_trigger_count integer not null default 3 check (feedback_trigger_count > 0),
  beta_trial_limit integer not null default 5 check (beta_trial_limit > 0),
  survey_version integer not null default 1 check (survey_version > 0),
  reservation_ttl interval not null default interval '10 minutes'
);

insert into public.sa_beta_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.sa_beta_visitors (
  id uuid primary key,
  authenticated_user_id uuid unique,
  contact_id text,
  survey_status text not null default 'never_seen'
    check (survey_status in (
      'never_seen', 'shown', 'dismissed_continue', 'started',
      'completed_verified', 'already_completed_claimed'
    )),
  survey_version integer,
  survey_impression_count integer not null default 0,
  survey_start_count integer not null default 0,
  survey_completion_count integer not null default 0,
  already_completed_claim_count integer not null default 0,
  survey_first_shown_at timestamptz,
  survey_started_at timestamptz,
  survey_completed_at timestamptz,
  survey_duration_seconds integer,
  survey_abandon_step integer,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  locale text,
  language text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sa_beta_visitors_last_seen_idx on public.sa_beta_visitors (last_seen_at desc);
create index if not exists sa_beta_visitors_utm_campaign_idx on public.sa_beta_visitors (utm_campaign);

create table if not exists public.sa_beta_sessions (
  id uuid primary key,
  visitor_id uuid not null references public.sa_beta_visitors (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  locale text,
  language text,
  timezone text,
  device_category text,
  browser_family text,
  os_family text,
  viewport_width integer,
  viewport_height integer,
  abuse_signal text,
  app_version text,
  analysis_engine_version text
);

create index if not exists sa_beta_sessions_visitor_idx on public.sa_beta_sessions (visitor_id, started_at desc);

create table if not exists public.sa_beta_analysis_runs (
  id uuid primary key,
  visitor_id uuid not null references public.sa_beta_visitors (id) on delete cascade,
  session_id uuid not null references public.sa_beta_sessions (id) on delete cascade,
  client_run_id uuid not null,
  status text not null check (status in ('started', 'success', 'failure', 'cancelled', 'expired')),
  counts_toward_trial boolean not null default true,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  error_code text,
  error_category text,
  app_version text,
  analysis_engine_version text,
  settlement_key text,
  settlement_name text,
  municipality text,
  region text,
  area_km2 numeric(12, 3),
  analysis_package text,
  layers jsonb not null default '[]'::jsonb,
  options jsonb not null default '{}'::jsonb,
  config_fingerprint text,
  map_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (visitor_id, client_run_id)
);

create index if not exists sa_beta_runs_visitor_status_idx on public.sa_beta_analysis_runs (visitor_id, status);
create index if not exists sa_beta_runs_settlement_idx on public.sa_beta_analysis_runs (settlement_key);
create index if not exists sa_beta_runs_package_idx on public.sa_beta_analysis_runs (analysis_package);

create table if not exists public.sa_beta_events (
  id uuid primary key,
  visitor_id uuid not null references public.sa_beta_visitors (id) on delete cascade,
  session_id uuid references public.sa_beta_sessions (id) on delete set null,
  analysis_run_id uuid references public.sa_beta_analysis_runs (id) on delete set null,
  lead_id uuid,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sa_beta_events_visitor_name_idx on public.sa_beta_events (visitor_id, event_name, created_at desc);
create index if not exists sa_beta_events_name_created_idx on public.sa_beta_events (event_name, created_at desc);
create unique index if not exists sa_beta_events_page_view_uidx
  on public.sa_beta_events (session_id)
  where event_name = 'beta_page_view';

create table if not exists public.sa_beta_survey_responses (
  id uuid primary key,
  visitor_id uuid not null references public.sa_beta_visitors (id) on delete cascade,
  session_id uuid references public.sa_beta_sessions (id) on delete set null,
  survey_version integer not null,
  status text not null check (status in ('draft', 'completed')),
  answers jsonb not null default '{}'::jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  abandon_step integer,
  app_version text,
  analysis_engine_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (visitor_id, survey_version)
);

create table if not exists public.sa_beta_leads (
  id uuid primary key,
  visitor_id uuid not null unique references public.sa_beta_visitors (id) on delete cascade,
  survey_response_id uuid references public.sa_beta_survey_responses (id) on delete set null,
  business_interest text not null check (business_interest in ('discuss', 'info')),
  name text,
  organisation text,
  email text,
  phone text,
  role text,
  organisation_work_frequency text,
  usefulness_score integer,
  intended_use_cases jsonb not null default '[]'::jsonb,
  requested_capabilities jsonb not null default '[]'::jsonb,
  workflow_stages jsonb not null default '[]'::jsonb,
  automation_need text,
  what_they_want_to_discuss text,
  acquisition_source text,
  utm_campaign text,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sa_beta_leads_interest_idx on public.sa_beta_leads (business_interest, created_at desc);

alter table public.sa_beta_events
  drop constraint if exists sa_beta_events_lead_id_fkey;
alter table public.sa_beta_events
  add constraint sa_beta_events_lead_id_fkey
  foreign key (lead_id) references public.sa_beta_leads (id) on delete set null;

-- Reserve a trial slot inside the insert transaction.
-- Concurrent begins block on the visitor row, so two tabs cannot both pass the fifth analysis.
create or replace function public.sa_beta_guard_run_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_ttl interval;
  v_used integer := 0;
begin
  if new.status <> 'started' then
    raise exception 'must_start' using errcode = 'P0001';
  end if;

  if new.counts_toward_trial then
    select s.beta_trial_limit, s.reservation_ttl
      into v_limit, v_ttl
    from public.sa_beta_settings s
    where s.id = 1;

    if v_limit is null or v_ttl is null then
      raise exception 'beta_settings_missing' using errcode = 'P0001';
    end if;

    perform 1
    from public.sa_beta_visitors
    where id = new.visitor_id
    for update;

    update public.sa_beta_analysis_runs
      set status = 'expired',
          completed_at = now(),
          error_code = 'expired',
          error_category = 'expired'
    where visitor_id = new.visitor_id
      and status = 'started'
      and counts_toward_trial
      and started_at < now() - v_ttl;

    select count(*) into v_used
    from public.sa_beta_analysis_runs
    where visitor_id = new.visitor_id
      and counts_toward_trial
      and status in ('started', 'success');

    if v_used >= v_limit then
      raise exception 'trial_limit' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sa_beta_guard_run_insert_trg on public.sa_beta_analysis_runs;
create trigger sa_beta_guard_run_insert_trg
  before insert on public.sa_beta_analysis_runs
  for each row execute function public.sa_beta_guard_run_insert();

create or replace function public.sa_beta_guard_run_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'success' and new.status is distinct from 'success' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if new.status = 'success' and old.status not in ('started', 'success') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists sa_beta_guard_run_update_trg on public.sa_beta_analysis_runs;
create trigger sa_beta_guard_run_update_trg
  before update on public.sa_beta_analysis_runs
  for each row execute function public.sa_beta_guard_run_update();

create or replace function public.sa_beta_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sa_beta_visitors_updated_at on public.sa_beta_visitors;
create trigger sa_beta_visitors_updated_at
  before update on public.sa_beta_visitors
  for each row execute function public.sa_beta_touch_updated_at();

drop trigger if exists sa_beta_survey_updated_at on public.sa_beta_survey_responses;
create trigger sa_beta_survey_updated_at
  before update on public.sa_beta_survey_responses
  for each row execute function public.sa_beta_touch_updated_at();

drop trigger if exists sa_beta_leads_updated_at on public.sa_beta_leads;
create trigger sa_beta_leads_updated_at
  before update on public.sa_beta_leads
  for each row execute function public.sa_beta_touch_updated_at();

create or replace view public.beta_visitor_summary
with (security_invoker = true) as
select
  v.id as visitor_id,
  v.first_seen_at as first_seen,
  v.last_seen_at as last_seen,
  (select count(*) from public.sa_beta_sessions s where s.visitor_id = v.id) as session_count,
  (
    select count(*)::integer from (
      select (timezone('Europe/Sofia', s.started_at))::date as day
      from public.sa_beta_sessions s
      where s.visitor_id = v.id
      union
      select (timezone('Europe/Sofia', r.completed_at))::date
      from public.sa_beta_analysis_runs r
      where r.visitor_id = v.id and r.status = 'success' and r.completed_at is not null
    ) days
  ) as distinct_active_days,
  (select count(*) from public.sa_beta_analysis_runs r where r.visitor_id = v.id and r.status = 'success') as successful_analysis_count,
  (select count(*) from public.sa_beta_analysis_runs r where r.visitor_id = v.id and r.status = 'success' and r.counts_toward_trial) as trial_success_count,
  (select count(*) from public.sa_beta_analysis_runs r where r.visitor_id = v.id and r.status = 'failure') as failed_analysis_count,
  (select count(*) from public.sa_beta_analysis_runs r where r.visitor_id = v.id) as analysis_attempt_count,
  (select count(distinct r.settlement_key) from public.sa_beta_analysis_runs r where r.visitor_id = v.id and r.status = 'success' and r.settlement_key is not null) as distinct_settlement_count,
  (
    select coalesce(sum(extra), 0) from (
      select count(*) - 1 as extra
      from public.sa_beta_analysis_runs r
      where r.visitor_id = v.id and r.status = 'success' and r.settlement_key is not null
      group by r.settlement_key
      having count(*) > 1
    ) repeats
  ) as repeat_same_settlement_count,
  (
    select count(distinct r.config_fingerprint)
    from public.sa_beta_analysis_runs r
    where r.visitor_id = v.id and r.status = 'success' and r.config_fingerprint is not null
  ) as configuration_variation,
  case
    when exists (
      select 1 from public.sa_beta_survey_responses sr
      where sr.visitor_id = v.id and sr.status = 'completed'
    ) then 'completed_verified'
    else v.survey_status
  end as survey_status,
  (select (sr.answers->>'usefulness_score')::integer from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1) as survey_score,
  (select sr.answers->>'role' from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1) as role,
  (select sr.answers->>'organisation_work_frequency' from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1) as organisation_work_frequency,
  (select sr.answers->'intended_use_cases' from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1) as intended_use_cases,
  (select sr.answers->'requested_capabilities' from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1) as requested_capabilities,
  (select sr.answers->'workflow_stages' from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1) as workflow_stages,
  (select sr.answers->>'automation_need' from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1) as automation_need,
  coalesce(
    (select l.business_interest from public.sa_beta_leads l where l.visitor_id = v.id limit 1),
    (select sr.answers->>'business_interest' from public.sa_beta_survey_responses sr where sr.visitor_id = v.id and sr.status = 'completed' order by sr.completed_at desc nulls last limit 1)
  ) as business_interest,
  (select l.name from public.sa_beta_leads l where l.visitor_id = v.id limit 1) as name,
  (select l.organisation from public.sa_beta_leads l where l.visitor_id = v.id limit 1) as organisation,
  (select l.email from public.sa_beta_leads l where l.visitor_id = v.id limit 1) as email,
  (select l.phone from public.sa_beta_leads l where l.visitor_id = v.id limit 1) as phone,
  (select count(*) from public.sa_beta_events e where e.visitor_id = v.id and e.event_name = 'beta_feedback_prompt_shown') as survey_impression_count,
  (select count(*) from public.sa_beta_events e where e.visitor_id = v.id and e.event_name = 'beta_feedback_started') as survey_start_count,
  (select count(*) from public.sa_beta_events e where e.visitor_id = v.id and e.event_name = 'survey_completed') as survey_completion_count,
  (select count(*) from public.sa_beta_events e where e.visitor_id = v.id and e.event_name = 'survey_already_completed_clicked') as already_completed_claim_count,
  coalesce(nullif(v.utm_source, ''), 'direct') as acquisition_source,
  v.utm_campaign,
  v.utm_medium,
  v.utm_content,
  v.utm_term,
  v.referrer,
  (select min(r.completed_at) from public.sa_beta_analysis_runs r where r.visitor_id = v.id and r.status = 'success') as first_analysis_at,
  (select max(r.completed_at) from public.sa_beta_analysis_runs r where r.visitor_id = v.id and r.status = 'success') as last_analysis_at
from public.sa_beta_visitors v;

create or replace view public.beta_funnel_summary
with (security_invoker = true) as
select
  v.id as visitor_id,
  coalesce(nullif(v.utm_source, ''), 'direct') as acquisition_source,
  v.utm_campaign,
  v.utm_medium,
  v.utm_content,
  v.utm_term,
  v.referrer,
  true as opened_tool,
  coalesce((
    select count(*) >= 1 from public.sa_beta_analysis_runs r
    where r.visitor_id = v.id and r.status = 'success' and r.counts_toward_trial
  ), false) as first_successful_analysis,
  coalesce((
    select count(*) >= (select feedback_trigger_count from public.sa_beta_settings where id = 1)
    from public.sa_beta_analysis_runs r
    where r.visitor_id = v.id and r.status = 'success' and r.counts_toward_trial
  ), false) as third_successful_analysis,
  exists (
    select 1 from public.sa_beta_events e
    where e.visitor_id = v.id and e.event_name = 'beta_feedback_prompt_shown'
  ) as feedback_prompt_shown,
  exists (
    select 1 from public.sa_beta_events e
    where e.visitor_id = v.id and e.event_name = 'beta_feedback_started'
  ) as survey_started,
  exists (
    select 1 from public.sa_beta_survey_responses sr
    where sr.visitor_id = v.id and sr.status = 'completed'
  ) as survey_completed,
  (
    select count(*) from public.sa_beta_events e
    where e.visitor_id = v.id and e.event_name = 'survey_already_completed_clicked'
  ) as already_completed_claim_count,
  exists (
    select 1 from public.sa_beta_visitors vv
    where vv.id = v.id and vv.survey_status = 'already_completed_claimed'
      and not exists (
        select 1 from public.sa_beta_survey_responses sr
        where sr.visitor_id = v.id and sr.status = 'completed'
      )
  ) as already_completed_claimed,
  coalesce((
    select count(*) >= (select beta_trial_limit from public.sa_beta_settings where id = 1)
    from public.sa_beta_analysis_runs r
    where r.visitor_id = v.id and r.status = 'success' and r.counts_toward_trial
  ), false) as fifth_successful_analysis,
  coalesce((
    select sr.answers->>'business_interest' in ('discuss', 'info')
    from public.sa_beta_survey_responses sr
    where sr.visitor_id = v.id and sr.status = 'completed'
    order by sr.completed_at desc nulls last
    limit 1
  ), false) as business_interest,
  exists (
    select 1 from public.sa_beta_leads l
    where l.visitor_id = v.id and l.email is not null and length(btrim(l.email)) > 0
  ) as lead_submitted
from public.sa_beta_visitors v;

create or replace view public.beta_feature_demand
with (security_invoker = true) as
select
  sr.visitor_id,
  'intended_use_case'::text as dimension,
  item.label,
  sr.answers->>'role' as role,
  (sr.answers->>'usefulness_score')::integer as usefulness_score,
  sr.answers->>'business_interest' as business_interest,
  sr.answers->>'automation_need' as automation_need,
  sr.answers->>'organisation_work_frequency' as organisation_work_frequency
from public.sa_beta_survey_responses sr
cross join lateral jsonb_array_elements_text(coalesce(sr.answers->'intended_use_cases', '[]'::jsonb)) as item(label)
where sr.status = 'completed'
union all
select
  sr.visitor_id,
  'requested_capability',
  item.label,
  sr.answers->>'role',
  (sr.answers->>'usefulness_score')::integer,
  sr.answers->>'business_interest',
  sr.answers->>'automation_need',
  sr.answers->>'organisation_work_frequency'
from public.sa_beta_survey_responses sr
cross join lateral jsonb_array_elements_text(coalesce(sr.answers->'requested_capabilities', '[]'::jsonb)) as item(label)
where sr.status = 'completed'
union all
select
  sr.visitor_id,
  'workflow_stage',
  item.label,
  sr.answers->>'role',
  (sr.answers->>'usefulness_score')::integer,
  sr.answers->>'business_interest',
  sr.answers->>'automation_need',
  sr.answers->>'organisation_work_frequency'
from public.sa_beta_survey_responses sr
cross join lateral jsonb_array_elements_text(coalesce(sr.answers->'workflow_stages', '[]'::jsonb)) as item(label)
where sr.status = 'completed'
union all
select
  sr.visitor_id,
  'automation_need',
  sr.answers->>'automation_need',
  sr.answers->>'role',
  (sr.answers->>'usefulness_score')::integer,
  sr.answers->>'business_interest',
  sr.answers->>'automation_need',
  sr.answers->>'organisation_work_frequency'
from public.sa_beta_survey_responses sr
where sr.status = 'completed'
  and coalesce(sr.answers->>'automation_need', '') <> '';

create or replace view public.beta_repeat_users
with (security_invoker = true) as
select
  visitor_id,
  first_seen,
  last_seen,
  session_count,
  distinct_active_days,
  successful_analysis_count,
  trial_success_count,
  distinct_settlement_count,
  repeat_same_settlement_count,
  configuration_variation,
  survey_status,
  business_interest,
  acquisition_source,
  utm_campaign,
  role,
  organisation_work_frequency
from public.beta_visitor_summary
where session_count > 1
   or distinct_active_days > 1
   or successful_analysis_count > 1
   or repeat_same_settlement_count > 0
   or configuration_variation > 1;

create or replace view public.beta_leads
with (security_invoker = true) as
select
  l.id as lead_id,
  l.visitor_id,
  l.name,
  l.organisation,
  l.email,
  l.phone,
  l.business_interest as interest_level,
  l.role,
  l.organisation_work_frequency,
  l.usefulness_score,
  l.intended_use_cases,
  l.requested_capabilities,
  l.workflow_stages,
  l.automation_need,
  l.what_they_want_to_discuss,
  s.successful_analysis_count,
  s.session_count,
  s.distinct_active_days,
  s.first_seen,
  s.last_seen,
  s.acquisition_source,
  coalesce(l.utm_campaign, s.utm_campaign) as utm_campaign,
  l.created_at as lead_created_at
from public.sa_beta_leads l
join public.beta_visitor_summary s on s.visitor_id = l.visitor_id;

create or replace view public.beta_settlement_usage
with (security_invoker = true) as
select
  settlement_key,
  max(settlement_name) as settlement_name,
  max(municipality) as municipality,
  max(region) as region,
  count(*) filter (where status = 'success') as success_count,
  count(*) filter (where status = 'failure') as failure_count,
  count(distinct visitor_id) filter (where status = 'success') as visitor_count
from public.sa_beta_analysis_runs
where settlement_key is not null
group by settlement_key;

create or replace view public.beta_product_usage
with (security_invoker = true) as
select 'package'::text as dimension, analysis_package as label, count(*) filter (where status = 'success') as success_count, count(distinct visitor_id) as visitors
from public.sa_beta_analysis_runs
where analysis_package is not null
group by analysis_package
union all
select 'layer', layer.label, count(*) filter (where r.status = 'success'), count(distinct r.visitor_id)
from public.sa_beta_analysis_runs r
cross join lateral jsonb_array_elements_text(coalesce(r.layers, '[]'::jsonb)) as layer(label)
group by layer.label;

alter table public.sa_beta_settings enable row level security;
alter table public.sa_beta_visitors enable row level security;
alter table public.sa_beta_sessions enable row level security;
alter table public.sa_beta_analysis_runs enable row level security;
alter table public.sa_beta_events enable row level security;
alter table public.sa_beta_survey_responses enable row level security;
alter table public.sa_beta_leads enable row level security;

revoke all on table public.sa_beta_settings from public, anon, authenticated;
revoke all on table public.sa_beta_visitors from public, anon, authenticated;
revoke all on table public.sa_beta_sessions from public, anon, authenticated;
revoke all on table public.sa_beta_analysis_runs from public, anon, authenticated;
revoke all on table public.sa_beta_events from public, anon, authenticated;
revoke all on table public.sa_beta_survey_responses from public, anon, authenticated;
revoke all on table public.sa_beta_leads from public, anon, authenticated;

revoke all on table public.beta_visitor_summary from public, anon, authenticated;
revoke all on table public.beta_funnel_summary from public, anon, authenticated;
revoke all on table public.beta_feature_demand from public, anon, authenticated;
revoke all on table public.beta_repeat_users from public, anon, authenticated;
revoke all on table public.beta_leads from public, anon, authenticated;
revoke all on table public.beta_settlement_usage from public, anon, authenticated;
revoke all on table public.beta_product_usage from public, anon, authenticated;

grant select, insert, update, delete on table public.sa_beta_settings to service_role;
grant select, insert, update, delete on table public.sa_beta_visitors to service_role;
grant select, insert, update, delete on table public.sa_beta_sessions to service_role;
grant select, insert, update, delete on table public.sa_beta_analysis_runs to service_role;
grant select, insert, update, delete on table public.sa_beta_events to service_role;
grant select, insert, update, delete on table public.sa_beta_survey_responses to service_role;
grant select, insert, update, delete on table public.sa_beta_leads to service_role;

grant select on table public.beta_visitor_summary to service_role;
grant select on table public.beta_funnel_summary to service_role;
grant select on table public.beta_feature_demand to service_role;
grant select on table public.beta_repeat_users to service_role;
grant select on table public.beta_leads to service_role;
grant select on table public.beta_settlement_usage to service_role;
grant select on table public.beta_product_usage to service_role;

revoke all on function public.sa_beta_guard_run_insert() from public, anon, authenticated;
revoke all on function public.sa_beta_guard_run_update() from public, anon, authenticated;
revoke all on function public.sa_beta_touch_updated_at() from public, anon, authenticated;
grant execute on function public.sa_beta_guard_run_insert() to service_role;
grant execute on function public.sa_beta_guard_run_update() to service_role;
grant execute on function public.sa_beta_touch_updated_at() to service_role;
