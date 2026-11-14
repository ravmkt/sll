create schema if not exists gate;

create table if not exists gate.gates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  domains text[] not null,
  gate_url text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  whatsapp_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists gates_store_idx on gate.gates(store_id);
create index if not exists gates_domains_idx on gate.gates using gin(domains);

alter table gate.gates enable row level security;

drop policy if exists gates_owner_all on gate.gates;
drop policy if exists gates_superadmin_all on gate.gates;
drop policy if exists gates_access on gate.gates;

create policy gates_access on gate.gates for all to authenticated
  using (public.is_superadmin() or public.is_store_owner_or_member(store_id))
  with check (public.is_superadmin() or public.is_store_owner_or_member(store_id));

grant usage on schema gate to authenticated, service_role;
grant all on gate.gates to authenticated, service_role;
