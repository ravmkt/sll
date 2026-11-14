drop schema if exists sizeadvisor cascade;
create schema sizeadvisor;

create table sizeadvisor.size_charts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.sll_stores(id) on delete cascade,
  name text not null,
  gender text not null default 'F' check (gender in ('F','M','U')),
  category text,
  created_at timestamptz not null default now()
);

create table sizeadvisor.size_chart_rows (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null references sizeadvisor.size_charts(id) on delete cascade,
  store_id uuid not null references public.sll_stores(id) on delete cascade,
  size_label text not null,
  measure_key text not null check (measure_key in ('bust','waist','hip','height','foot','length')),
  min_cm numeric(5,1) not null,
  max_cm numeric(5,1) not null,
  sort_order int not null default 0,
  unique (chart_id, size_label, measure_key)
);

create table sizeadvisor.chart_assignments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.sll_stores(id) on delete cascade,
  chart_id uuid not null references sizeadvisor.size_charts(id) on delete cascade,
  match_type text not null check (match_type in ('product_id','sku','category','handle','url_pattern')),
  match_value text not null
);

create table sizeadvisor.sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.sll_stores(id) on delete cascade,
  anon_id text not null,
  product_ref text,
  gender text,
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  age int,
  fit_pref smallint default 0,
  recommended_size text,
  selected_size text,
  added_to_cart boolean default false,
  created_at timestamptz not null default now()
);

create table sizeadvisor.fit_feedback (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.sll_stores(id) on delete cascade,
  product_ref text,
  size_label text,
  outcome text not null check (outcome in ('kept','too_small','too_big','other')),
  created_at timestamptz not null default now()
);

create index on sizeadvisor.size_chart_rows (chart_id);
create index on sizeadvisor.sessions (store_id, created_at desc);
create index on sizeadvisor.chart_assignments (store_id, match_type, match_value);

create or replace function sizeadvisor.is_store_member(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sll_stores s where s.id = sid and s.owner_id = auth.uid())
      or exists (select 1 from public.sll_store_members m where m.store_id = sid and m.user_id = auth.uid())
      or exists (select 1 from public.admin_superusers a where a.user_id = auth.uid());
$$;

do $$
declare t text;
begin
  foreach t in array array['size_charts','size_chart_rows','chart_assignments','sessions','fit_feedback'] loop
    execute format('alter table sizeadvisor.%I enable row level security', t);
    execute format('create policy "%s_member_all" on sizeadvisor.%I for all using (sizeadvisor.is_store_member(store_id)) with check (sizeadvisor.is_store_member(store_id))', t, t);
  end loop;
end $$;

grant usage on schema sizeadvisor to authenticated, service_role;
grant all on all tables in schema sizeadvisor to authenticated, service_role;
grant execute on function sizeadvisor.is_store_member(uuid) to authenticated, service_role;
