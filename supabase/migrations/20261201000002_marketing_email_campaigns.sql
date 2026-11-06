alter table public.stores add column if not exists marketing_opt_out boolean not null default false;

create table if not exists public.marketing_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  message text not null,
  audience text not null check (audience in ('all','past_due','trial','store')),
  store_id uuid references public.stores(id) on delete set null,
  status text not null default 'sending' check (status in ('sending','sent','partial','failed')),
  total int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.marketing_email_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_email_campaigns(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  email text not null,
  status text not null check (status in ('sent','failed')),
  resend_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists marketing_email_sends_campaign_idx on public.marketing_email_sends(campaign_id);
create index if not exists marketing_email_sends_created_idx on public.marketing_email_sends(created_at);

alter table public.marketing_email_campaigns enable row level security;
alter table public.marketing_email_sends enable row level security;

create or replace function public.email_campaign_recipients(p_audience text, p_store_id uuid default null)
returns table(store_id uuid, email text)
language sql
security definer
set search_path to 'public'
as $$
  select distinct on (lower(trim(s.owner_contact_email))) s.id, lower(trim(s.owner_contact_email))
  from public.stores s
  where coalesce(trim(s.owner_contact_email), '') <> ''
    and s.marketing_opt_out = false
    and (
      p_audience = 'all'
      or (p_audience = 'past_due' and s.past_due_since is not null)
      or (p_audience = 'trial' and s.trial_ends_at is not null and s.trial_ends_at > now())
      or (p_audience = 'store' and s.id = p_store_id)
    )
  order by lower(trim(s.owner_contact_email)), s.id;
$$;
revoke all on function public.email_campaign_recipients(text, uuid) from public, anon, authenticated;
grant execute on function public.email_campaign_recipients(text, uuid) to service_role;

create or replace function public.admin_email_recipient_count(p_audience text, p_store_id uuid default null)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare n int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select count(*) into n from public.email_campaign_recipients(p_audience, p_store_id);
  return n;
end $$;

create or replace function public.admin_email_campaigns_list()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.created_at desc)
    from (select * from public.marketing_email_campaigns order by created_at desc limit 50) c
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_email_metrics(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'sent', count(*) filter (where status = 'sent'),
    'failed', count(*) filter (where status = 'failed')
  ) into v
  from public.marketing_email_sends
  where created_at >= p_start::timestamptz and created_at < (p_end + 1)::timestamptz;
  return v;
end $$;