create table if not exists public.user_tours (
  user_id uuid not null references auth.users(id) on delete cascade,
  tour_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, tour_key)
);

alter table public.user_tours enable row level security;
drop policy if exists user_tours_own on public.user_tours;
create policy user_tours_own on public.user_tours
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

select count(*) as tours_registrados from public.user_tours;