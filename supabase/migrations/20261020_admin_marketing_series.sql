create or replace function public.admin_marketing_series(p_start date, p_end date, p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_daily jsonb; v_stores int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'day', to_char(d.day, 'YYYY-MM-DD'),
           'impressions', coalesce(x.imp, 0),
           'clicks', coalesce(x.clk, 0),
           'closes', coalesce(x.cls, 0)) order by d.day), '[]'::jsonb)
  into v_daily
  from (select p_start + n as day from generate_series(0, p_end - p_start) as n) d
  left join (
    select (e.created_at at time zone 'America/Sao_Paulo')::date as day,
           count(*) filter (where e.event_type = 'impression') as imp,
           count(*) filter (where e.event_type = 'click') as clk,
           count(*) filter (where e.event_type = 'close') as cls
    from public.marketing_events e
    join public.marketing_items i on i.id = e.item_id
    where (p_kind is null or i.kind::text = p_kind)
      and e.created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
      and e.created_at <  ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    group by 1
  ) x on x.day = d.day;

  select count(distinct e.store_id) into v_stores
  from public.marketing_events e
  join public.marketing_items i on i.id = e.item_id
  where e.event_type = 'impression'
    and (p_kind is null or i.kind::text = p_kind)
    and e.created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and e.created_at <  ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');

  return jsonb_build_object('daily', v_daily, 'stores', coalesce(v_stores, 0));
end $function$;

grant execute on function public.admin_marketing_series(date, date, text) to authenticated;