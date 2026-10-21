alter table public.sector_benchmarks
  add column if not exists cart_abandonment_min numeric,
  add column if not exists cart_abandonment_max numeric;

create table if not exists public.sector_benchmarks_history (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references public.sectors(id) on delete cascade,
  sector_name text not null,
  year integer not null check (year between 2016 and 2100),
  conversion_rate_min numeric,
  conversion_rate_max numeric,
  video_ctr_min numeric,
  video_ctr_max numeric,
  retention_5s_min numeric,
  retention_5s_max numeric,
  add_to_cart_min numeric,
  add_to_cart_max numeric,
  ticket_avg_min numeric,
  ticket_avg_max numeric,
  cart_abandonment_min numeric,
  cart_abandonment_max numeric,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sector_id, year)
);
create index if not exists idx_sbh_year on public.sector_benchmarks_history (year desc);

alter table public.sector_benchmarks_history enable row level security;
drop policy if exists "le historico benchmarks" on public.sector_benchmarks_history;
create policy "le historico benchmarks" on public.sector_benchmarks_history
  for select to authenticated using (true);
drop policy if exists "master escreve historico benchmarks" on public.sector_benchmarks_history;
create policy "master escreve historico benchmarks" on public.sector_benchmarks_history
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

-- Semente: o valor atual vira o registro do ano corrente
insert into public.sector_benchmarks_history
  (sector_id, sector_name, year, conversion_rate_min, conversion_rate_max, video_ctr_min, video_ctr_max,
   retention_5s_min, retention_5s_max, add_to_cart_min, add_to_cart_max, ticket_avg_min, ticket_avg_max,
   source_reference)
select sector_id, sector_name, extract(year from now())::int, conversion_rate_min, conversion_rate_max,
       video_ctr_min, video_ctr_max, retention_5s_min, retention_5s_max, add_to_cart_min, add_to_cart_max,
       ticket_avg_min, ticket_avg_max, source_reference
from public.sector_benchmarks
on conflict (sector_id, year) do nothing;

select count(*) as historico from public.sector_benchmarks_history;