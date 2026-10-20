create table if not exists public.noah_credit_packs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  qty int not null check (qty > 0),
  price_cents int not null default 0 check (price_cents >= 0),
  sort int not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.noah_pack_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  pack_id uuid not null references public.noah_credit_packs(id),
  qty int not null,
  price_cents int not null,
  status text not null default 'pending' check (status in ('pending','paid','canceled')),
  asaas_payment_id text unique,
  invoice_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_noah_pack_orders_store on public.noah_pack_orders (store_id, status);

alter table public.noah_credit_packs enable row level security;
alter table public.noah_pack_orders enable row level security;

drop policy if exists "le pacotes ativos" on public.noah_credit_packs;
create policy "le pacotes ativos" on public.noah_credit_packs
  for select to authenticated using (is_active or public.is_superadmin());
drop policy if exists "master gerencia pacotes" on public.noah_credit_packs;
create policy "master gerencia pacotes" on public.noah_credit_packs
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "lojista le seus pedidos de pacote" on public.noah_pack_orders;
create policy "lojista le seus pedidos de pacote" on public.noah_pack_orders
  for select to authenticated using (public.is_store_owner_or_member(store_id) or public.is_superadmin());

create or replace function public.noah_settle_pack_payment(p_asaas_payment_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare o public.noah_pack_orders;
begin
  update public.noah_pack_orders
     set status = 'paid', paid_at = now()
   where asaas_payment_id = p_asaas_payment_id and status = 'pending'
  returning * into o;
  if not found then return 0; end if;
  perform public.noah_add_extra_credits(o.store_id, o.qty);
  return o.qty;
end $$;

revoke all on function public.noah_settle_pack_payment(text) from public, anon, authenticated;
grant execute on function public.noah_settle_pack_payment(text) to service_role;

insert into public.noah_credit_packs (key, name, qty, sort) values
  ('noah_100',  '100 mensagens do Noah',  100, 1),
  ('noah_300',  '300 mensagens do Noah',  300, 2),
  ('noah_1000', '1.000 mensagens do Noah', 1000, 3)
on conflict (key) do nothing;

select key, qty, price_cents, is_active from public.noah_credit_packs order by sort;