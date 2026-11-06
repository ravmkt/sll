create table if not exists public.infra_quotas (
  key text primary key,
  service text not null,
  label text not null,
  unit text not null,
  included numeric not null default 0,
  overage_usd numeric not null default 0,
  source text not null default 'manual' check (source in ('auto','manual')),
  sort int not null default 0
);
create table if not exists public.infra_usage (
  key text primary key,
  value numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.infra_quotas enable row level security;
alter table public.infra_usage enable row level security;
drop policy if exists "master gerencia franquias" on public.infra_quotas;
create policy "master gerencia franquias" on public.infra_quotas
  for all using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists "master gerencia uso" on public.infra_usage;
create policy "master gerencia uso" on public.infra_usage
  for all using (public.is_superadmin()) with check (public.is_superadmin());

insert into public.infra_quotas (key, service, label, unit, included, overage_usd, source, sort) values
  ('supabase_db_gb',      'supabase', 'Banco de dados',         'GB',       8,      0.125,   'auto',   1),
  ('supabase_storage_gb', 'supabase', 'Storage de arquivos',    'GB',       100,    0.021,   'auto',   2),
  ('supabase_egress_gb',  'supabase', 'Tráfego de saída',       'GB',       250,    0.09,    'manual', 3),
  ('supabase_mau',        'supabase', 'Usuários ativos (MAU)',  'usuários', 100000, 0.00325, 'auto',   4),
  ('vercel_transfer_gb',  'vercel',   'Transferência de dados', 'GB',       1000,   0.15,    'manual', 5),
  ('vercel_requests_m',   'vercel',   'Requisições de borda',   'milhões',  10,     2,       'manual', 6)
on conflict (key) do nothing;

create or replace function public.admin_supabase_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  db numeric := 0;
  st numeric := 0;
  mau bigint := 0;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select pg_database_size(current_database())::numeric / 1073741824 into db;
  begin
    select coalesce(sum((metadata->>'size')::numeric), 0) / 1073741824 into st from storage.objects;
  exception when others then st := 0;
  end;
  begin
    select count(*) into mau from auth.users where last_sign_in_at > now() - interval '30 days';
  exception when others then mau := 0;
  end;
  return jsonb_build_object('supabase_db_gb', round(db, 3), 'supabase_storage_gb', round(st, 3), 'supabase_mau', mau);
end;
$$;

revoke all on function public.admin_supabase_usage() from public, anon;
grant execute on function public.admin_supabase_usage() to authenticated;

select count(*) as franquias from public.infra_quotas;