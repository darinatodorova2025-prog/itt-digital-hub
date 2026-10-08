-- Operator hold. Phase stays put; the room and the phones wait until resume.

alter table public.md_event_campaigns
  add column if not exists paused boolean not null default false;
