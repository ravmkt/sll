create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ref_id uuid not null,
  sent_at timestamptz not null default now(),
  unique (kind, ref_id)
);

alter table public.email_events enable row level security;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select count(*) as email_events_ok from public.email_events;