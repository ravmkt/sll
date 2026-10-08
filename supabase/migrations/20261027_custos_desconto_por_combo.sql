alter table public.dynamic_plans add column if not exists discount_pct numeric not null default 0
  check (discount_pct >= 0 and discount_pct <= 90);

create table if not exists public.infrastructure_cost_settings (
  id int primary key default 1 check (id = 1),
  usd_to_brl_rate numeric(8,4) not null default 5.6000,
  last_currency_sync_at timestamptz,
  auto_sync_currency boolean not null default true,
  storage_cost_usd_per_gb numeric(8,4) not null default 0.0100,
  traffic_cost_usd_per_gb numeric(8,4) not null default 0.0075,
  supabase_pro_usd numeric(8,2) not null default 25.00,
  vercel_pro_usd numeric(8,2) not null default 20.00,
  domain_and_tools_monthly_brl numeric(10,2) not null default 100.00,
  gateway_fee_percent numeric(5,2) not null default 3.50,
  tax_percent numeric(5,2) not null default 6.00,
  min_tenants_divider int not null default 10 check (min_tenants_divider >= 1),
  mb_per_play numeric(6,2) not null default 4.00,
  realistic_usage_percent numeric(5,2) not null default 40.00,
  updated_at timestamptz not null default now()
);
insert into public.infrastructure_cost_settings (id) values (1) on conflict do nothing;
alter table public.infrastructure_cost_settings enable row level security;
drop policy if exists "master gerencia custos" on public.infrastructure_cost_settings;
create policy "master gerencia custos" on public.infrastructure_cost_settings
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create table if not exists public.fx_rate_history (
  day date primary key,
  rate numeric(8,4) not null
);
alter table public.fx_rate_history enable row level security;
drop policy if exists "master gerencia cambio" on public.fx_rate_history;
create policy "master gerencia cambio" on public.fx_rate_history
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create or replace function public.admin_paying_stores_count()
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare v int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select count(distinct store_id)::int into v from public.subscriptions where is_current and status = 'active';
  return coalesce(v, 0);
end;
$$;

create or replace function public.admin_apply_combo_discount(p_combo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d numeric;
  m bigint; s bigint; a bigint;
  n int; nm int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select discount_pct into d from public.dynamic_plans where id = p_combo_id and is_combo;
  if not found then raise exception 'combo nao encontrado'; end if;

  select count(*) into nm from public.combo_modules where plan_id = p_combo_id;

  select count(x.m), coalesce(sum(x.m), 0), coalesce(sum(x.s), 0), coalesce(sum(x.a), 0)
    into n, m, s, a
  from public.combo_modules cm
  cross join lateral (
    select dp.price_monthly_cents as m, dp.price_semiannual_cents as s, dp.price_annual_cents as a
    from public.dynamic_plans dp
    where dp.module_slug = cm.module_slug
      and not dp.is_combo
      and (cm.member_tier is null or dp.plan_tier = cm.member_tier)
    order by dp.is_active desc, dp.price_monthly_cents desc
    limit 1
  ) x
  where cm.plan_id = p_combo_id;

  if nm < 2 or n <> nm then
    raise exception 'o combo precisa de 2 ou mais modulos, todos com plano cadastrado';
  end if;

  update public.dynamic_plans
     set price_monthly_cents = round(m * (1 - d / 100))::int,
         price_semiannual_cents = round(s * (1 - d / 100))::int,
         price_annual_cents = round(a * (1 - d / 100))::int
   where id = p_combo_id;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'combo_price_recalculated',
          jsonb_build_object('combo_id', p_combo_id, 'discount_percent', d, 'list_monthly_cents', m));

  return jsonb_build_object('discount_percent', d, 'list_monthly_cents', m, 'monthly_cents', round(m * (1 - d / 100))::int);
end;
$$;

create or replace function public.admin_set_combo_discount_pct(p_id uuid, p_pct numeric, p_recalc boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_pct is null or p_pct < 0 or p_pct > 90 then raise exception 'desconto entre 0 e 90'; end if;
  update public.dynamic_plans set discount_pct = p_pct where id = p_id and is_combo;
  if not found then raise exception 'combo nao encontrado'; end if;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'combo_discount_pct_changed', jsonb_build_object('combo_id', p_id, 'percent', p_pct));
  if p_recalc then return public.admin_apply_combo_discount(p_id); end if;
  return jsonb_build_object('discount_percent', p_pct);
end;
$$;

revoke all on function public.admin_paying_stores_count() from public, anon;
revoke all on function public.admin_apply_combo_discount(uuid) from public, anon;
revoke all on function public.admin_set_combo_discount_pct(uuid, numeric, boolean) from public, anon;
grant execute on function public.admin_paying_stores_count() to authenticated;
grant execute on function public.admin_apply_combo_discount(uuid) to authenticated;
grant execute on function public.admin_set_combo_discount_pct(uuid, numeric, boolean) to authenticated;

-- Combos existentes: descobre o desconto implicito no preco ja salvo (nao altera precos)
update public.dynamic_plans c
   set discount_pct = greatest(0, least(90, round((1 - c.price_monthly_cents::numeric / t.m) * 100, 2)))
  from (
    select cm.plan_id, sum(x.pm) as m, count(x.pm) as n, count(*) as nm
    from public.combo_modules cm
    left join lateral (
      select dp.price_monthly_cents as pm
      from public.dynamic_plans dp
      where dp.module_slug = cm.module_slug and not dp.is_combo
        and (cm.member_tier is null or dp.plan_tier = cm.member_tier)
      order by dp.is_active desc, dp.price_monthly_cents desc
      limit 1
    ) x on true
    group by cm.plan_id
  ) t
 where c.id = t.plan_id and c.is_combo and c.discount_pct = 0 and t.n = t.nm and t.nm >= 2 and t.m > 0;

select usd_to_brl_rate from public.infrastructure_cost_settings;