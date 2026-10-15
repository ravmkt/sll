alter table public.addons add column if not exists billing_type text not null default 'recurring';
alter table public.addons drop constraint if exists addons_billing_type_check;
alter table public.addons add constraint addons_billing_type_check check (billing_type in ('recurring','one_time'));

create or replace function public.quote_addons(p_addon_ids uuid[], p_cycle text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  months int := case lower(coalesce(p_cycle, 'monthly')) when 'semiannual' then 6 when 'yearly' then 12 when 'annual' then 12 else 1 end;
  ids uuid[] := array(select distinct unnest(coalesce(p_addon_ids, '{}'::uuid[])));
  n int; total numeric; once numeric; items jsonb;
begin
  select count(*),
         coalesce(sum(price_monthly * case when billing_type = 'one_time' then 1 else months end), 0),
         coalesce(sum(price_monthly) filter (where billing_type = 'one_time'), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'name', name, 'billing_type', billing_type,
           'monthly_cents', round(price_monthly * 100)::int,
           'cycle_cents', round(price_monthly * 100 * case when billing_type = 'one_time' then 1 else months end)::int)), '[]'::jsonb)
    into n, total, once, items
  from public.addons where id = any(ids) and is_active and is_upsell;
  if n <> coalesce(cardinality(ids), 0) then
    return jsonb_build_object('valid', false, 'reason', 'add-on indisponivel');
  end if;
  return jsonb_build_object('valid', true, 'months', months,
    'total_cents', round(total * 100)::int,
    'one_time_cents', round(once * 100)::int,
    'recurring_cents', round((total - once) * 100)::int,
    'items', items);
end;
$$;
grant execute on function public.quote_addons(uuid[], text) to authenticated, service_role;

select billing_type, count(*) from public.addons group by 1;