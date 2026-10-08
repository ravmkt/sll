create or replace function public.admin_dashboard_metrics(
  p_start date,
  p_end date,
  p_module text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_core jsonb;
  v_gran text := case when p_end - p_start > 62 then 'month' else 'day' end;
  v_vid boolean := (p_module is null or p_module = 'vidlytics');
  v_rev jsonb;
  v_views_series jsonb;
  v_top jsonb;
  v_revenue bigint := 0;
  v_views bigint := 0;
  v_events bigint := 0;
  v_storage bigint := 0;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  -- Lojas e financeiro recorrente
  with subs as (
    select s.store_id, s.status,
           coalesce(cp.price_cents, p.price_cents, 0) as charge,
           case when cp.price_cents is not null
                then cp.price_cents::numeric / (case s.billing_cycle when 'semiannual' then 6 when 'yearly' then 12 else 1 end)
                else coalesce(p.price_cents, 0) end as monthly
    from public.subscriptions s
    left join public.plans p on p.id = s.plan_id
    left join lateral (
      select pp.price_cents from public.plan_prices pp
      where pp.plan_id = s.plan_id and pp.billing_cycle = s.billing_cycle and pp.is_active
      limit 1
    ) cp on true
    where s.is_current = true
      and (p_module is null
           or s.module_key = p_module
           or (coalesce(s.module_key, 'bundle') = 'bundle' and to_jsonb(p.modules) ? p_module))
  ),
  st as (
    select t.id,
           (t.referred_by_store_id is not null) as referred,
           case
             when exists (select 1 from subs x where x.store_id = t.id and x.status = 'past_due') then 'past_due'
             when exists (select 1 from subs x where x.store_id = t.id and x.status = 'active') then 'active'
             when exists (select 1 from subs x where x.store_id = t.id and x.status = 'trialing')
               or (p_module is null and t.subscription_status = 'trialing' and t.trial_ends_at > now()) then 'trial'
             else 'inactive'
           end as state
    from public.stores t
    where p_module is null or exists (select 1 from subs x where x.store_id = t.id)
  )
  select jsonb_build_object(
    'stores', (select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where state = 'active'),
        'inactive', count(*) filter (where state = 'inactive'),
        'past_due', count(*) filter (where state = 'past_due'),
        'trial', count(*) filter (where state = 'trial'),
        'referred_active', count(*) filter (where state = 'active' and referred)
      ) from st),
    'past_due_total', (select coalesce(sum(charge), 0) from subs where status = 'past_due'),
    'forecast', (select coalesce(round(sum(monthly)), 0) from subs where status = 'active')
  ) into v_core;

  -- Faturamento do periodo (faturas pagas)
  select coalesce(sum(i.amount_cents), 0) into v_revenue
  from public.invoices i
  left join public.subscriptions s on s.id = i.subscription_id
  where i.status = 'paid'
    and (coalesce(i.paid_at, i.created_at) at time zone 'America/Sao_Paulo')::date between p_start and p_end
    and (p_module is null or s.module_key = p_module);

  select coalesce(jsonb_agg(jsonb_build_object('d', g.d, 'v', coalesce(r.v, 0)) order by g.d), '[]'::jsonb)
  into v_rev
  from (
    select d::date as d
    from generate_series(
      case when v_gran = 'month' then date_trunc('month', p_start::timestamp) else p_start::timestamp end,
      p_end::timestamp,
      case when v_gran = 'month' then interval '1 month' else interval '1 day' end
    ) d
  ) g
  left join (
    select date_trunc(v_gran, (coalesce(i.paid_at, i.created_at) at time zone 'America/Sao_Paulo'))::date as d,
           sum(i.amount_cents)::bigint as v
    from public.invoices i
    left join public.subscriptions s on s.id = i.subscription_id
    where i.status = 'paid'
      and (coalesce(i.paid_at, i.created_at) at time zone 'America/Sao_Paulo')::date between p_start and p_end
      and (p_module is null or s.module_key = p_module)
    group by 1
  ) r on r.d = g.d;

  -- Consumo (Vidlytics)
  if v_vid then
    select coalesce(sum(m.views_count), 0) into v_views
    from public.daily_video_metrics m
    where m."date" between p_start and p_end;

    select count(*) into v_events
    from public.store_activity_events e
    where (e.created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end;

    begin
      select coalesce(sum(coalesce((to_jsonb(v)->>'file_size_bytes')::bigint, (to_jsonb(v)->>'file_size')::bigint, 0)), 0)
      into v_storage
      from vidlytics.vid_videos v;
    exception when others then
      v_storage := 0;
    end;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('d', g.d, 'v', coalesce(r.v, 0)) order by g.d), '[]'::jsonb)
  into v_views_series
  from (
    select d::date as d
    from generate_series(
      case when v_gran = 'month' then date_trunc('month', p_start::timestamp) else p_start::timestamp end,
      p_end::timestamp,
      case when v_gran = 'month' then interval '1 month' else interval '1 day' end
    ) d
  ) g
  left join (
    select date_trunc(v_gran, m."date"::timestamp)::date as d, sum(m.views_count)::bigint as v
    from public.daily_video_metrics m
    where v_vid and m."date" between p_start and p_end
    group by 1
  ) r on r.d = g.d;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_top
  from (
    select st2.id, st2.name, sum(m.views_count)::bigint as views
    from public.daily_video_metrics m
    join public.stores st2 on st2.id::text = m.store_id::text
    where v_vid and m."date" between p_start and p_end
    group by st2.id, st2.name
    order by 3 desc
    limit 8
  ) t;

  return v_core || jsonb_build_object(
    'revenue', v_revenue,
    'granularity', v_gran,
    'revenue_series', v_rev,
    'views_series', v_views_series,
    'consumption', jsonb_build_object('views', v_views, 'events', v_events, 'storage_bytes', v_storage),
    'top_stores', v_top
  );
end;
$$;

revoke all on function public.admin_dashboard_metrics(date, date, text) from public, anon;
grant execute on function public.admin_dashboard_metrics(date, date, text) to authenticated;