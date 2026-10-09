insert into public.plan_addons (module_slug, key, name, price_monthly_cents, grants, is_active) values
  ('vidlytics', 'videos_10', '+10 Vídeos Ativos',       2990, '{"max_videos":10}', true),
  ('vidlytics', 'views_25k', '+25.000 Visualizações',   3990, '{"views":25000}',   true)
on conflict (module_slug, key) do update
  set name = excluded.name, price_monthly_cents = excluded.price_monthly_cents,
      grants = excluded.grants, is_active = true;

update public.plan_addons set is_active = false
 where module_slug = 'vidlytics' and key in ('videos_pages', 'plays');

create table if not exists public.addon_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  addon_id uuid not null references public.plan_addons(id),
  status text not null default 'pending' check (status in ('pending', 'active', 'canceled')),
  asaas_subscription_id text,
  invoice_url text,
  created_at timestamptz not null default now(),
  activated_at timestamptz
);
create index if not exists idx_addon_orders_asaas on public.addon_orders (asaas_subscription_id);
create index if not exists idx_addon_orders_store on public.addon_orders (store_id, status);

alter table public.addon_orders enable row level security;
drop policy if exists "lojista le seus pedidos de addon" on public.addon_orders;
create policy "lojista le seus pedidos de addon" on public.addon_orders
  for select using (public.is_store_owner_or_member(store_id) or public.is_superadmin());

create or replace function public.activate_addon_order(p_asaas_subscription_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare o public.addon_orders;
begin
  update public.addon_orders
     set status = 'active', activated_at = now()
   where asaas_subscription_id = p_asaas_subscription_id and status = 'pending'
  returning * into o;
  if not found then return false; end if;

  insert into public.subscription_addons (subscription_id, addon_id, quantity)
  values (o.subscription_id, o.addon_id, 1)
  on conflict (subscription_id, addon_id)
  do update set quantity = public.subscription_addons.quantity + 1;
  return true;
end;
$$;

revoke all on function public.activate_addon_order(text) from public, anon, authenticated;
grant execute on function public.activate_addon_order(text) to service_role;

select key, name, price_monthly_cents, is_active from public.plan_addons where module_slug = 'vidlytics' order by key;