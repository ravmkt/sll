create schema if not exists radar;

create table if not exists radar.settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  category text,
  regions jsonb not null default '[]',
  competitors jsonb not null default '[]',
  health_score int,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists radar.connections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check (provider in ('gsc','ga4','gbp','meta','widget')),
  status text not null default 'disconnected' check (status in ('connected','disconnected','error')),
  account_ref text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique (store_id, provider)
);

create table if not exists radar.keywords (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  term text not null,
  region text,
  source text not null default 'manual' check (source in ('manual','ai','gsc')),
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, term, region)
);

create table if not exists radar.tasks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  category text not null,
  priority text not null default 'media' check (priority in ('alta','media','baixa')),
  status text not null default 'open' check (status in ('open','done','ignored')),
  action_type text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists radar.product_suggestions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id text not null,
  status text not null default 'pending' check (status in ('pending','applied','rejected','reverted')),
  score_before int,
  score_after int,
  fields jsonb not null default '{}',
  backup jsonb,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists radar_tasks_store_status_idx on radar.tasks (store_id, status);
create index if not exists radar_sugg_store_status_idx on radar.product_suggestions (store_id, status);

do $$
declare t text;
begin
  foreach t in array array['settings','connections','keywords','tasks','product_suggestions'] loop
    execute format('alter table radar.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_store_access" on radar.%1$I', t);
    execute format($p$create policy "%1$s_store_access" on radar.%1$I
      for all using (public.user_has_store_access(store_id))
      with check (public.user_has_store_access(store_id))$p$, t);
  end loop;
end $$;

grant usage on schema radar to authenticated, service_role;
grant all on all tables in schema radar to authenticated, service_role;
alter default privileges in schema radar grant all on tables to authenticated, service_role;