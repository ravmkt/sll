-- Dados públicos da integração (sem tokens)
create table if not exists public.store_integrations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  platform text not null,
  created_at timestamptz not null default now()
);

alter table public.store_integrations add column if not exists account_id text;
alter table public.store_integrations add column if not exists account_username text;
alter table public.store_integrations add column if not exists display_name text;
alter table public.store_integrations add column if not exists avatar_url text;
alter table public.store_integrations add column if not exists scopes text[] not null default '{}';
alter table public.store_integrations add column if not exists status text not null default 'active';
alter table public.store_integrations add column if not exists profile jsonb not null default '{}'::jsonb;
alter table public.store_integrations add column if not exists token_expires_at timestamptz;
alter table public.store_integrations add column if not exists connected_at timestamptz not null default now();
alter table public.store_integrations add column if not exists updated_at timestamptz not null default now();

create unique index if not exists store_integrations_store_platform_uidx
  on public.store_integrations (store_id, platform);

alter table public.store_integrations enable row level security;

drop policy if exists "store_integrations_owner_select" on public.store_integrations;
create policy "store_integrations_owner_select" on public.store_integrations
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_user_id = auth.uid()));

drop policy if exists "store_integrations_owner_delete" on public.store_integrations;
create policy "store_integrations_owner_delete" on public.store_integrations
  for delete to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_user_id = auth.uid()));

-- Tokens: RLS ligado e sem policies = só service_role acessa
create table if not exists public.store_integration_secrets (
  integration_id uuid primary key references public.store_integrations(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  refresh_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.store_integration_secrets enable row level security;
revoke all on public.store_integration_secrets from anon, authenticated;
