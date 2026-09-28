-- A vote, interest signal, or follow-up must cite a theme from the same campaign.

create or replace function public.md_enforce_same_campaign_theme()
returns trigger language plpgsql as $$
declare
  theme_campaign uuid;
begin
  select campaign_id into theme_campaign from public.md_themes where id = new.theme_id;
  if theme_campaign is null or theme_campaign is distinct from new.campaign_id then
    raise exception 'invalid_theme';
  end if;
  return new;
end;
$$;

drop trigger if exists md_votes_campaign_trg on public.md_votes;
create trigger md_votes_campaign_trg
  before insert on public.md_votes
  for each row execute function public.md_enforce_same_campaign_theme();

drop trigger if exists md_interest_campaign_trg on public.md_interest_signals;
create trigger md_interest_campaign_trg
  before insert on public.md_interest_signals
  for each row execute function public.md_enforce_same_campaign_theme();

drop trigger if exists md_followup_campaign_trg on public.md_followup_requests;
create trigger md_followup_campaign_trg
  before insert on public.md_followup_requests
  for each row execute function public.md_enforce_same_campaign_theme();
