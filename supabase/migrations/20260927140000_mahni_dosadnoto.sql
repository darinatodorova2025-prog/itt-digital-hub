-- Махни досадното — conference event schema
-- Apply: supabase db push / migration up

do $$ begin
  create type public.md_event_phase as enum (
    'DRAFT', 'COLLECTING', 'ANALYZING', 'VOTING', 'FINALIZING', 'AI_JURY', 'RESULTS', 'CLOSED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.md_ai_run_status as enum ('pending', 'running', 'succeeded', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.md_judge_type as enum ('business_value', 'feasibility', 'innovation');
exception when duplicate_object then null;
end $$;

create table if not exists public.md_event_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  phase public.md_event_phase not null default 'DRAFT',
  show_recent_ideas boolean not null default true,
  voting_ends_at timestamptz,
  human_result_locked_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.md_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  organization text not null,
  role text not null,
  email text not null,
  phone text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_version text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);

create table if not exists public.md_participant_sessions (
  token_hash text primary key,
  participant_id uuid not null references public.md_participants (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists md_participant_sessions_participant_idx on public.md_participant_sessions (participant_id);

create table if not exists public.md_ideas (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  participant_id uuid not null references public.md_participants (id) on delete cascade,
  organization text not null,
  role text not null,
  body text not null,
  frequency text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists md_ideas_campaign_idx on public.md_ideas (campaign_id, created_at desc);

create table if not exists public.md_idempotency_keys (
  scope text primary key,
  resource_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.md_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  status public.md_ai_run_status not null default 'pending',
  provider text,
  model text,
  attempt integer not null default 1,
  error_code text,
  error_message text,
  stage text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.md_themes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  analysis_run_id uuid not null references public.md_analysis_runs (id) on delete cascade,
  title text not null,
  description text not null,
  is_ai_wildcard boolean not null default false,
  sort_order integer not null default 0,
  idea_count integer not null default 0,
  organization_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.md_theme_idea_links (
  theme_id uuid not null references public.md_themes (id) on delete cascade,
  idea_id uuid not null references public.md_ideas (id) on delete cascade,
  primary key (theme_id, idea_id)
);

create table if not exists public.md_votes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  participant_id uuid not null references public.md_participants (id) on delete cascade,
  theme_id uuid not null references public.md_themes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_id, theme_id)
);

create index if not exists md_votes_theme_idx on public.md_votes (theme_id);

create table if not exists public.md_interest_signals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  participant_id uuid not null references public.md_participants (id) on delete cascade,
  theme_id uuid not null references public.md_themes (id) on delete cascade,
  organization text not null,
  created_at timestamptz not null default now(),
  unique (participant_id, theme_id)
);

create table if not exists public.md_ai_jury_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  judge_type public.md_judge_type not null,
  status public.md_ai_run_status not null default 'pending',
  provider text,
  model text,
  attempt integer not null default 1,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, judge_type)
);

create table if not exists public.md_ai_jury_votes (
  id uuid primary key default gen_random_uuid(),
  jury_run_id uuid not null references public.md_ai_jury_runs (id) on delete cascade,
  theme_id uuid not null references public.md_themes (id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  rationale text not null,
  unique (jury_run_id, theme_id),
  unique (jury_run_id, rank)
);

create table if not exists public.md_followup_requests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  participant_id uuid not null references public.md_participants (id) on delete cascade,
  organization text not null,
  theme_id uuid not null references public.md_themes (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.md_event_audit_log (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.md_event_campaigns (id) on delete cascade,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.md_enforce_vote_limit()
returns trigger language plpgsql as $$
declare
  vote_count integer;
  campaign_phase public.md_event_phase;
  ends_at timestamptz;
begin
  select c.phase, c.voting_ends_at into campaign_phase, ends_at
  from public.md_event_campaigns c
  join public.md_themes t on t.campaign_id = c.id
  where t.id = new.theme_id;

  if campaign_phase not in ('VOTING') then
    raise exception 'not_voting';
  end if;
  if ends_at is not null and ends_at <= now() then
    raise exception 'voting_closed';
  end if;

  select count(*) into vote_count from public.md_votes where participant_id = new.participant_id;
  if vote_count >= 3 then
    raise exception 'vote_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists md_votes_limit_trg on public.md_votes;
create trigger md_votes_limit_trg
  before insert on public.md_votes
  for each row execute function public.md_enforce_vote_limit();

alter table public.md_event_campaigns enable row level security;
alter table public.md_participants enable row level security;
alter table public.md_participant_sessions enable row level security;
alter table public.md_ideas enable row level security;
alter table public.md_votes enable row level security;
alter table public.md_themes enable row level security;

-- No public policies: application uses service role on server only.

insert into public.md_event_campaigns (slug, title, phase)
values ('mahni-dosadnoto-vik-2026', 'Махни досадното', 'DRAFT')
on conflict (slug) do nothing;
