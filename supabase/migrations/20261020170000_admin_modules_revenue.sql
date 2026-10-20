create or replace function public.admin_modules_revenue(p_from date, p_to date, p_store uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_group text;
  v_res jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'periodo invalido'; end if;
  v_group := case when (p_to - p_from) > 60 then 'month' else 'day' end;

  with b as (
    select
      i.store_id,
      i.amount_cents as amt,
      (date_trunc(v_group, i.paid_at at time zone 'America/Sao_Paulo'))::date as bucket,
      (coalesce(dp.is_combo, false) or s.module_key = 'bundle' or s.combo_kind is not null) as is_combo,
      case when (coalesce(dp.is_combo, false) or s.module_key = 'bundle' or s.combo_kind is not null)
           then 'combo:' || coalesce(dp.id::text, 'bundle')
           else coalesce(s.module_key, dp.module_slug, 'outros') end as item_key,
      case when (coalesce(dp.is_combo, false) or s.module_key = 'bundle' or s.combo_kind is not null)
           then coalesce(dp.plan_name, 'Combo')
           else coalesce(hm.name, s.module_key, dp.module_slug, 'Outros') end as item_label
    from public.invoices i
    left join public.subscriptions s on s.id = i.subscription_id
    left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
    left join public.hub_modules hm on hm.slug = coalesce(s.module_key, dp.module_slug)
    where i.status = 'paid'
      and i.paid_at >= (p_from::timestamp at time zone 'America/Sao_Paulo')
      and i.paid_at <  ((p_to + 1)::timestamp at time zone 'America/Sao_Paulo')
      and (p_store is null or i.store_id = p_store)
  )
  select jsonb_build_object(
    'group', v_group,
    'from', p_from,
    'to', p_to,
    'revenue_modules', coalesce((select sum(amt) from b where not is_combo), 0),
    'revenue_combos',  coalesce((select sum(amt) from b where is_combo), 0),
    'revenue_total',   coalesce((select sum(amt) from b), 0),
    'paying_stores',   (select count(distinct store_id) from b),
    'series', coalesce((select jsonb_agg(jsonb_build_object('bucket', bucket, 'item_key', item_key, 'item_label', item_label, 'is_combo', is_combo, 'cents', c))
                        from (select bucket, item_key, item_label, is_combo, sum(amt) as c from b group by 1,2,3,4) x), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('item_key', item_key, 'item_label', item_label, 'is_combo', is_combo, 'cents', c) order by c desc)
                       from (select item_key, item_label, is_combo, sum(amt) as c from b group by 1,2,3) y), '[]'::jsonb)
  ) into v_res;

  return v_res;
end;
$fn$;

revoke all on function public.admin_modules_revenue(date, date, uuid) from public;
grant execute on function public.admin_modules_revenue(date, date, uuid) to authenticated;