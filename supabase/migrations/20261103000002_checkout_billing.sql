create table if not exists public.billing_info (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.billing_info add column if not exists person_type text default 'pf';
alter table public.billing_info add column if not exists legal_name text;
alter table public.billing_info add column if not exists cnpj_cpf text;
alter table public.billing_info add column if not exists email text;
alter table public.billing_info add column if not exists phone text;
alter table public.billing_info add column if not exists cep text;
alter table public.billing_info add column if not exists address text;
alter table public.billing_info add column if not exists number text;
alter table public.billing_info add column if not exists complement text;
alter table public.billing_info add column if not exists neighborhood text;
alter table public.billing_info add column if not exists city text;
alter table public.billing_info add column if not exists state text;
create unique index if not exists uq_billing_info_store on public.billing_info (store_id);

alter table public.billing_info enable row level security;
drop policy if exists billing_info_owner on public.billing_info;
create policy billing_info_owner on public.billing_info for all to authenticated
  using (exists (select 1 from public.stores s where s.id = billing_info.store_id and s.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = billing_info.store_id and s.owner_user_id = auth.uid()));

alter table public.subscriptions add column if not exists coupon_id uuid references public.discount_coupons(id);
alter table public.subscriptions add column if not exists coupon_discount_cents int;

create or replace function public.release_coupon(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.discount_coupons set times_used = greatest(times_used - 1, 0) where id = p_coupon_id;
$$;
revoke all on function public.release_coupon(uuid) from public, anon, authenticated;
grant execute on function public.release_coupon(uuid) to service_role;

select column_name from information_schema.columns where table_schema='public' and table_name='billing_info' order by ordinal_position;