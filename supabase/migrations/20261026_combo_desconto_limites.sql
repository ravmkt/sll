create table if not exists public.pricing_settings (
  id boolean primary key default true check (id),
  combo_discount_percent numeric not null default 10 check (combo_discount_percent >= 0 and combo_discount_percent <= 90),
  updated_at timestamptz not null default now()
);
insert into public.pricing_settings (id) values (true) on conflict do nothing;
alter table public.pricing_settings enable row level security;
drop policy if exists "le config de precos" on public.pricing_settings;
create policy "le config de precos" on public.pricing_settings for select using (true);
drop policy if exists "master escreve config de precos" on public.pricing_settings;
create policy "master escreve config de precos" on public.pricing_settings
  for all using (public.is_superadmin()) with check (public.is_superadmin());

alter table public.combo_modules add column if not exists limits_override jsonb not null default '{}'::jsonb;

alter table public.subscriptions add column if not exists combo_group_id uuid;
alter table public.subscriptions add column if not exists combo_kind text;
alter table public.subscriptions add column if not exists list_price_cents integer;
alter table public.subscriptions add column if not exists combo_discount_percent numeric;
alter table public.subscriptions drop constraint if exists subscriptions_combo_kind_check;
alter table public.subscriptions add constraint subscriptions_combo_kind_check
  check (combo_kind is null or combo_kind in ('fixed', 'custom'));
create index if not exists idx_subscriptions_combo_group on public.subscriptions (combo_group_id) where combo_group_id is not null;

create or replace function public.get_combo_discount()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select combo_discount_percent from public.pricing_settings where id = true;
$$;

create or replace function public.admin_set_combo_discount(p_percent numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_percent is null or p_percent < 0 or p_percent > 90 then raise exception 'desconto entre 0 e 90'; end if;
  update public.pricing_settings set combo_discount_percent = p_percent, updated_at = now() where id = true;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'combo_discount_changed', jsonb_build_object('percent', p_percent));
end;
$$;

create or replace function public.admin_set_combo_module_limits(p_combo_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  update public.combo_modules cm
     set limits_override = coalesce(i.o, '{}'::jsonb)
    from (select x ->> 'module_slug' as s, x -> 'limits_override' as o from jsonb_array_elements(p_items) x) i
   where cm.plan_id = p_combo_id and cm.module_slug = i.s;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'combo_limits_changed', jsonb_build_object('combo_id', p_combo_id, 'items', p_items));
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
  if not exists (select 1 from public.dynamic_plans where id = p_combo_id and is_combo) then
    raise exception 'combo nao encontrado';
  end if;

  select combo_discount_percent into d from public.pricing_settings where id = true;
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

-- Cotacao do combo personalizado (usada na tela publica da parte 2)
create or replace function public.quote_custom_combo(p_plan_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d numeric;
  n int; nm int;
  m bigint; s bigint; a bigint;
  items jsonb;
  want int := coalesce(array_length(p_plan_ids, 1), 0);
begin
  select combo_discount_percent into d from public.pricing_settings where id = true;

  select count(*), count(distinct module_slug),
         coalesce(sum(price_monthly_cents), 0), coalesce(sum(price_semiannual_cents), 0), coalesce(sum(price_annual_cents), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'dynamic_plan_id', id, 'module_slug', module_slug, 'plan_name', plan_name,
           'monthly_cents', price_monthly_cents, 'semiannual_cents', price_semiannual_cents, 'annual_cents', price_annual_cents)), '[]'::jsonb)
    into n, nm, m, s, a, items
  from public.dynamic_plans
  where id = any(p_plan_ids) and is_active and not is_combo;

  if want < 2 or n <> want then
    return jsonb_build_object('valid', false, 'reason', 'escolha ao menos 2 planos ativos');
  end if;
  if nm <> n then
    return jsonb_build_object('valid', false, 'reason', 'escolha apenas um plano por modulo');
  end if;

  return jsonb_build_object(
    'valid', true,
    'discount_percent', d,
    'items', items,
    'list', jsonb_build_object('monthly_cents', m, 'semiannual_cents', s, 'annual_cents', a),
    'total', jsonb_build_object(
      'monthly_cents', round(m * (1 - d / 100))::int,
      'semiannual_cents', round(s * (1 - d / 100))::int,
      'annual_cents', round(a * (1 - d / 100))::int));
end;
$$;

revoke all on function public.get_combo_discount() from public;
revoke all on function public.quote_custom_combo(uuid[]) from public;
revoke all on function public.admin_set_combo_discount(numeric) from public, anon;
revoke all on function public.admin_set_combo_module_limits(uuid, jsonb) from public, anon;
revoke all on function public.admin_apply_combo_discount(uuid) from public, anon;
grant execute on function public.get_combo_discount() to anon, authenticated;
grant execute on function public.quote_custom_combo(uuid[]) to anon, authenticated;
grant execute on function public.admin_set_combo_discount(numeric) to authenticated;
grant execute on function public.admin_set_combo_module_limits(uuid, jsonb) to authenticated;
grant execute on function public.admin_apply_combo_discount(uuid) to authenticated;

select public.get_combo_discount() as desconto_padrao;