create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_monthly numeric(10,2) not null default 0,
  scope text not null default 'global',
  target_resource text not null default 'custom',
  resource_amount numeric(10,2) not null default 0,
  is_upsell boolean not null default false,
  upsell_headline text,
  upsell_module_target text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addons add column if not exists description text;
alter table public.addons add column if not exists price_monthly numeric(10,2) not null default 0;
alter table public.addons add column if not exists scope text not null default 'global';
alter table public.addons add column if not exists target_resource text not null default 'custom';
alter table public.addons add column if not exists resource_amount numeric(10,2) not null default 0;
alter table public.addons add column if not exists is_upsell boolean not null default false;
alter table public.addons add column if not exists upsell_headline text;
alter table public.addons add column if not exists upsell_module_target text;
alter table public.addons add column if not exists is_active boolean not null default true;
alter table public.addons add column if not exists updated_at timestamptz not null default now();

alter table public.addons drop constraint if exists addons_target_resource_check;
alter table public.addons add constraint addons_target_resource_check check (target_resource in ('storage_gb','plays','videos','custom'));
alter table public.addons drop constraint if exists addons_scope_check;
alter table public.addons add constraint addons_scope_check check (scope ~ '^[a-z0-9_]+$');
alter table public.addons drop constraint if exists addons_price_check;
alter table public.addons add constraint addons_price_check check (price_monthly >= 0 and resource_amount >= 0);
alter table public.addons drop constraint if exists addons_upsell_check;
alter table public.addons add constraint addons_upsell_check
  check (not is_upsell or (upsell_headline is not null and length(btrim(upsell_headline)) > 0 and upsell_module_target is not null));

drop trigger if exists trg_addons_updated on public.addons;
create trigger trg_addons_updated before update on public.addons
  for each row execute function public.set_updated_at();

alter table public.addons enable row level security;
drop policy if exists "le addons ativos" on public.addons;
create policy "le addons ativos" on public.addons for select to authenticated
  using (is_active or public.is_superadmin());
drop policy if exists "master gerencia addons" on public.addons;
create policy "master gerencia addons" on public.addons for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

create table if not exists public.store_addons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'active' check (status in ('active','canceled')),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.store_addons add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;
create unique index if not exists uq_store_addons_sub_addon_active
  on public.store_addons (subscription_id, addon_id) where status = 'active';
create index if not exists idx_store_addons_store on public.store_addons (store_id, status);
drop trigger if exists trg_store_addons_updated on public.store_addons;
create trigger trg_store_addons_updated before update on public.store_addons
  for each row execute function public.set_updated_at();

alter table public.store_addons enable row level security;
drop policy if exists "le addons da loja" on public.store_addons;
create policy "le addons da loja" on public.store_addons for select to authenticated
  using (public.is_store_owner_or_member(store_id) or public.is_superadmin());
drop policy if exists "master gerencia addons da loja" on public.store_addons;
create policy "master gerencia addons da loja" on public.store_addons for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- Add-ons escolhidos no checkout, ativados quando o pagamento confirma
alter table public.subscriptions add column if not exists pending_addon_ids uuid[] not null default '{}';

-- Motor de limites: plano + add-ons antigos + add-ons novos (store_addons)
create or replace function public._module_limits(p_store_id uuid, p_module text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record; a record; g record; x record;
  v jsonb;
  best jsonb := null;
  k text;
begin
  for r in
    select s.id, s.module_key, s.dynamic_plan_id, s.plan_id
    from public.subscriptions s
    where s.store_id = p_store_id and s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
    order by (s.dynamic_plan_id is not null) desc, s.created_at desc
  loop
    v := null;
    if r.dynamic_plan_id is not null then
      select case
               when dp.is_combo then (
                 select pl.limits_config || coalesce(cm.limits_override, '{}'::jsonb)
                 from public.combo_modules cm
                 cross join lateral (
                   select y.limits_config from public.dynamic_plans y
                   where y.module_slug = cm.module_slug and not y.is_combo
                     and (cm.member_tier is null or y.plan_tier = cm.member_tier)
                   order by y.is_active desc, y.price_monthly_cents desc
                   limit 1
                 ) pl
                 where cm.plan_id = dp.id and cm.module_slug = p_module)
               when dp.module_slug = p_module then dp.limits_config
             end
        into v
      from public.dynamic_plans dp
      where dp.id = r.dynamic_plan_id;
    elsif r.plan_id is not null then
      select jsonb_build_object(
               'views', nullif(p.views_limit, 0),
               'max_videos', nullif(p.videos_limit, 0),
               'max_pages', nullif(p.pages_limit, 0),
               'storage_gb', case when coalesce(p.storage_limit_bytes, 0) = 0 then null
                                  else round(p.storage_limit_bytes / 1073741824.0, 2) end)
        into v
      from public.plans p
      where p.id = r.plan_id
        and (r.module_key = p_module
             or (coalesce(r.module_key, 'bundle') = 'bundle' and to_jsonb(p.modules) ? p_module));
    end if;
    if v is not null and best is null then best := v; end if;
  end loop;

  if best is null then return null; end if;

  for a in
    select ad.grants, sa.quantity
    from public.subscription_addons sa
    join public.plan_addons ad on ad.id = sa.addon_id
    join public.subscriptions s on s.id = sa.subscription_id
    where s.store_id = p_store_id and s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
      and ad.module_slug = p_module
  loop
    for g in select key, value from jsonb_each_text(a.grants) loop
      if best ? g.key and jsonb_typeof(best -> g.key) = 'null' then continue; end if;
      best := best || jsonb_build_object(g.key, coalesce((best ->> g.key)::numeric, 0) + g.value::numeric * a.quantity);
    end loop;
  end loop;

  for x in
    select ad.target_resource, ad.resource_amount * sa.quantity as amt
    from public.store_addons sa
    join public.addons ad on ad.id = sa.addon_id
    where sa.store_id = p_store_id and sa.status = 'active'
      and (ad.scope = 'global' or ad.scope = p_module)
      and ad.target_resource in ('storage_gb', 'plays', 'videos')
  loop
    k := case x.target_resource when 'plays' then 'views' when 'videos' then 'max_videos' else 'storage_gb' end;
    if best ? k and jsonb_typeof(best -> k) = 'null' then continue; end if;
    best := best || jsonb_build_object(k, coalesce((best ->> k)::numeric, 0) + x.amt);
  end loop;

  return best;
end;
$$;

create or replace function public.trg_sync_limits_from_store_addon()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_store_limits(coalesce(new.store_id, old.store_id));
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_store_addons_limits on public.store_addons;
create trigger trg_store_addons_limits
  after insert or update or delete on public.store_addons
  for each row execute function public.trg_sync_limits_from_store_addon();

-- Cancelou a assinatura: os add-ons dela deixam de valer
create or replace function public.trg_cancel_store_addons()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'canceled' and old.status is distinct from 'canceled' then
    update public.store_addons set status = 'canceled' where subscription_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_sub_cancel_addons on public.subscriptions;
create trigger trg_sub_cancel_addons after update of status on public.subscriptions
  for each row execute function public.trg_cancel_store_addons();

-- Cotacao validada no servidor (preco mensal x meses do ciclo)
create or replace function public.quote_addons(p_addon_ids uuid[], p_cycle text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  months int := case lower(coalesce(p_cycle, 'monthly')) when 'semiannual' then 6 when 'yearly' then 12 when 'annual' then 12 else 1 end;
  ids uuid[] := array(select distinct unnest(coalesce(p_addon_ids, '{}'::uuid[])));
  n int; total numeric; items jsonb;
begin
  select count(*), coalesce(sum(price_monthly), 0),
         coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'monthly_cents', round(price_monthly * 100)::int,
                                               'cycle_cents', round(price_monthly * 100 * months)::int)), '[]'::jsonb)
    into n, total, items
  from public.addons where id = any(ids) and is_active and is_upsell;
  if n <> coalesce(cardinality(ids), 0) then
    return jsonb_build_object('valid', false, 'reason', 'add-on indisponivel');
  end if;
  return jsonb_build_object('valid', true, 'months', months, 'total_cents', round(total * 100 * months)::int, 'items', items);
end;
$$;
grant execute on function public.quote_addons(uuid[], text) to authenticated, service_role;

-- Chamada pelo webhook quando o pagamento da assinatura confirma
create or replace function public.activate_pending_addons(p_asaas_subscription_id text)
returns int
language plpgsql security definer set search_path = public as $$
declare s record; n int := 0;
begin
  select id, store_id, pending_addon_ids into s
  from public.subscriptions where asaas_subscription_id = p_asaas_subscription_id limit 1;
  if not found or coalesce(cardinality(s.pending_addon_ids), 0) = 0 then return 0; end if;

  insert into public.store_addons (store_id, addon_id, quantity, status, subscription_id)
  select s.store_id, a.id, 1, 'active', s.id from public.addons a where a.id = any(s.pending_addon_ids)
  on conflict (subscription_id, addon_id) where status = 'active' do nothing;
  get diagnostics n = row_count;

  update public.subscriptions set pending_addon_ids = '{}' where id = s.id;
  return n;
end;
$$;
revoke all on function public.activate_pending_addons(text) from public, anon, authenticated;
grant execute on function public.activate_pending_addons(text) to service_role;

select count(*) as addons from public.addons;