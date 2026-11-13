-- Módulo Try-On: schema exclusivo
create schema if not exists tryon;

-- ---------- Helpers ----------
create or replace function tryon.is_superadmin()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v boolean := false;
begin
  v := coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_superadmin')::boolean,
    (auth.jwt() ->> 'is_superadmin')::boolean,
    false
  );
  if v then return true; end if;
  if to_regprocedure('public.is_superadmin()') is not null then
    execute 'select public.is_superadmin()' into v;
  end if;
  return coalesce(v, false);
end $$;

create or replace function tryon.has_store_access(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores s where s.id = p_store_id and s.owner_user_id = auth.uid());
$$;

create or replace function tryon.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Configuração do lojista ----------
create table if not exists tryon.settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  enabled boolean not null default false,
  integration_type text not null default 'gtm' check (integration_type in ('yampi','gtm')),
  button_text text not null default 'Experimente em você',
  anchor_selector text,
  image_index int not null default 0,
  allowed_categories text[] not null default array['clothing'],
  hide_keywords text[] not null default array['acessorio','bolsa','mochila','oculos'],
  active_pages text[] not null default array['product'],
  photo_retention_days int not null default 30 check (photo_retention_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Limites e flags (somente SuperAdmin escreve) ----------
create table if not exists tryon.store_limits (
  store_id uuid primary key references public.stores(id) on delete cascade,
  product_mode_enabled boolean not null default true,
  storefront_mode_enabled boolean not null default false,
  monthly_credit_limit int not null default 500,
  max_generations_per_visitor int not null default 20,
  updated_at timestamptz not null default now()
);

-- ---------- Catálogo ----------
create table if not exists tryon.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  external_id text not null,
  name text,
  category text not null default 'clothing',
  garment_image_url text not null,
  source text not null default 'gtm' check (source in ('yampi','gtm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, external_id)
);

-- ---------- Fotos dos visitantes (LGPD) ----------
create table if not exists tryon.user_photos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id text not null,
  storage_path text not null,
  consent_at timestamptz not null,
  consent_version text not null default 'v1',
  expires_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_photos_session_idx on tryon.user_photos (store_id, session_id);
create index if not exists user_photos_expires_idx on tryon.user_photos (expires_at) where deleted_at is null;

-- ---------- Resultados (cache por foto + peça) ----------
create table if not exists tryon.results (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  photo_id uuid not null references tryon.user_photos(id) on delete cascade,
  product_id uuid references tryon.products(id) on delete set null,
  source_image_url text not null,
  cache_key text not null,
  result_path text,
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  provider text,
  model text,
  cost_usd numeric(10,4) not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (store_id, cache_key)
);
create index if not exists results_photo_idx on tryon.results (photo_id);
create index if not exists results_status_idx on tryon.results (store_id, status);

-- ---------- Consumo mensal ----------
create table if not exists tryon.usage (
  store_id uuid not null references public.stores(id) on delete cascade,
  period date not null,
  generations int not null default 0,
  cost_usd numeric(12,4) not null default 0,
  primary key (store_id, period)
);

-- ---------- Eventos ----------
create table if not exists tryon.events (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id text,
  event_type text not null,
  product_id uuid references tryon.products(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_store_idx on tryon.events (store_id, created_at desc);

-- ---------- Triggers ----------
drop trigger if exists trg_settings_updated on tryon.settings;
create trigger trg_settings_updated before update on tryon.settings for each row execute function tryon.set_updated_at();
drop trigger if exists trg_limits_updated on tryon.store_limits;
create trigger trg_limits_updated before update on tryon.store_limits for each row execute function tryon.set_updated_at();
drop trigger if exists trg_products_updated on tryon.products;
create trigger trg_products_updated before update on tryon.products for each row execute function tryon.set_updated_at();

-- ---------- Crédito atômico (service_role) ----------
create or replace function tryon.consume_credit(p_store_id uuid, p_cost numeric default 0)
returns boolean language plpgsql security definer set search_path = tryon, public as $$
declare
  v_limit int;
  v_period date := date_trunc('month', now())::date;
  v_used int;
begin
  select monthly_credit_limit into v_limit from tryon.store_limits where store_id = p_store_id;
  if v_limit is null then return false; end if;

  insert into tryon.usage (store_id, period) values (p_store_id, v_period) on conflict do nothing;

  update tryon.usage
     set generations = generations + 1, cost_usd = cost_usd + p_cost
   where store_id = p_store_id and period = v_period and generations < v_limit
   returning generations into v_used;

  return v_used is not null;
end $$;
revoke all on function tryon.consume_credit(uuid, numeric) from public, anon, authenticated;
grant execute on function tryon.consume_credit(uuid, numeric) to service_role;

-- ---------- Purga LGPD ----------
create or replace function tryon.purge_expired_photos()
returns table (id uuid, storage_path text) language sql security definer set search_path = tryon as $$
  update tryon.user_photos p
     set deleted_at = now()
   where p.deleted_at is null and p.expires_at < now()
   returning p.id, p.storage_path;
$$;
revoke all on function tryon.purge_expired_photos() from public, anon, authenticated;
grant execute on function tryon.purge_expired_photos() to service_role;

-- ---------- RLS ----------
alter table tryon.settings     enable row level security;
alter table tryon.store_limits enable row level security;
alter table tryon.products     enable row level security;
alter table tryon.user_photos  enable row level security;
alter table tryon.results      enable row level security;
alter table tryon.usage        enable row level security;
alter table tryon.events       enable row level security;

drop policy if exists settings_owner on tryon.settings;
create policy settings_owner on tryon.settings for all to authenticated
  using (tryon.has_store_access(store_id) or tryon.is_superadmin())
  with check (tryon.has_store_access(store_id) or tryon.is_superadmin());

drop policy if exists limits_read on tryon.store_limits;
create policy limits_read on tryon.store_limits for select to authenticated
  using (tryon.has_store_access(store_id) or tryon.is_superadmin());
drop policy if exists limits_admin_write on tryon.store_limits;
create policy limits_admin_write on tryon.store_limits for all to authenticated
  using (tryon.is_superadmin()) with check (tryon.is_superadmin());

drop policy if exists products_owner on tryon.products;
create policy products_owner on tryon.products for all to authenticated
  using (tryon.has_store_access(store_id) or tryon.is_superadmin())
  with check (tryon.has_store_access(store_id) or tryon.is_superadmin());

drop policy if exists photos_admin_read on tryon.user_photos;
create policy photos_admin_read on tryon.user_photos for select to authenticated using (tryon.is_superadmin());
drop policy if exists results_owner_read on tryon.results;
create policy results_owner_read on tryon.results for select to authenticated
  using (tryon.has_store_access(store_id) or tryon.is_superadmin());

drop policy if exists usage_read on tryon.usage;
create policy usage_read on tryon.usage for select to authenticated
  using (tryon.has_store_access(store_id) or tryon.is_superadmin());
drop policy if exists events_read on tryon.events;
create policy events_read on tryon.events for select to authenticated
  using (tryon.has_store_access(store_id) or tryon.is_superadmin());

-- ---------- Permissões ----------
grant usage on schema tryon to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema tryon to authenticated;
grant all on all tables in schema tryon to service_role;
grant usage, select on all sequences in schema tryon to authenticated, service_role;
grant execute on function tryon.is_superadmin() to authenticated, service_role;
grant execute on function tryon.has_store_access(uuid) to authenticated, service_role;

-- ---------- Storage privado ----------
insert into storage.buckets (id, name, public)
values ('tryon-photos', 'tryon-photos', false), ('tryon-results', 'tryon-results', false)
on conflict (id) do nothing;

-- ---------- IA: finalidade 'tryon' no controle do Master (reaproveita admin_ai_settings) ----------
do $$
begin
  insert into public.admin_ai_settings (purpose, provider, model, fallback_model, use_web_search, enabled)
  select 'tryon', 'gemini', 'gemini-2.5-flash-image', null, false, false
  where not exists (select 1 from public.admin_ai_settings where purpose = 'tryon');
exception when others then
  raise notice 'Seed admin_ai_settings tryon ignorado: %', sqlerrm;
end $$;

-- Verificação
select schema_name from information_schema.schemata where schema_name = 'tryon';
