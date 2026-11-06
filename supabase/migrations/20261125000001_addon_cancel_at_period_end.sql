-- Cancelamento de add-on recorrente no fim do ciclo
alter table public.store_addons
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists ends_at timestamptz,
  add column if not exists canceled_at timestamptz;

create index if not exists idx_store_addons_ends
  on public.store_addons (ends_at) where status = 'active' and cancel_at_period_end;

-- Revoga os add-ons cujo ciclo terminou (o gatilho de limites recalcula sozinho)
create or replace function public.revoke_expired_store_addons()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update public.store_addons
     set status = 'canceled', canceled_at = coalesce(canceled_at, now())
   where status = 'active'
     and cancel_at_period_end
     and ends_at is not null
     and ends_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.revoke_expired_store_addons() from public, anon, authenticated;
grant execute on function public.revoke_expired_store_addons() to service_role;

create extension if not exists pg_cron;
select cron.schedule('revoke-expired-addons', '*/30 * * * *', $cron$select public.revoke_expired_store_addons()$cron$);