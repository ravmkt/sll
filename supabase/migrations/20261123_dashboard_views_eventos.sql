-- A funcao atual vira a base; a nova a chama e troca so as metricas de views
do $$
begin
  if to_regprocedure('public._admin_dashboard_metrics_base(date,date,text)') is null then
    alter function public.admin_dashboard_metrics(date, date, text) rename to _admin_dashboard_metrics_base;
  end if;
end $$;

revoke all on function public._admin_dashboard_metrics_base(date, date, text) from public, anon, authenticated;

create or replace function public.admin_dashboard_metrics(p_start date, p_end date, p_module text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  g text;
  vs jsonb;
  tp jsonb;
  total bigint;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  v := public._admin_dashboard_metrics_base(p_start, p_end, p_module);
  if p_module is not null and p_module <> 'vidlytics' then return v; end if;

  g := coalesce(v ->> 'granularity', 'day');

  select count(*) into total
  from public.store_activity_events e
  where e.event_type = 'video_view'
    and (e.created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end;

  select coalesce(jsonb_agg(jsonb_build_object('d', x.d, 'v', coalesce(r.n, 0)) order by x.d), '[]'::jsonb) into vs
  from (
    select d::date as d
    from generate_series(
      case when g = 'month' then date_trunc('month', p_start::timestamp) else p_start::timestamp end,
      p_end::timestamp,
      case when g = 'month' then interval '1 month' else interval '1 day' end
    ) d
  ) x
  left join (
    select date_trunc(g, (e.created_at at time zone 'America/Sao_Paulo'))::date as d, count(*)::bigint as n
    from public.store_activity_events e
    where e.event_type = 'video_view'
      and (e.created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
    group by 1
  ) r on r.d = x.d;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into tp
  from (
    select s.id, s.name, count(*)::bigint as views
    from public.store_activity_events e
    join public.stores s on s.id::text = e.store_id::text
    where e.event_type = 'video_view'
      and (e.created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
    group by s.id, s.name
    order by 3 desc
    limit 8
  ) t;

  return v || jsonb_build_object(
    'consumption', (v -> 'consumption') || jsonb_build_object('views', total),
    'views_series', vs,
    'top_stores', tp
  );
end;
$$;

revoke all on function public.admin_dashboard_metrics(date, date, text) from public, anon;
grant execute on function public.admin_dashboard_metrics(date, date, text) to authenticated;

-- Receita por origem seguindo o periodo escolhido
create or replace function public.admin_revenue_origin(p_start date, p_end date, p_module text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gran text := case when p_end - p_start > 62 then 'month' else 'day' end;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'd', g.d,
             'new', coalesce(r.n, 0),
             'renewal', coalesce(r.rn, 0),
             'upfront', coalesce(r.u, 0)) order by g.d)
    from (
      select d::date as d
      from generate_series(
        case when v_gran = 'month' then date_trunc('month', p_start::timestamp) else p_start::timestamp end,
        p_end::timestamp,
        case when v_gran = 'month' then interval '1 month' else interval '1 day' end
      ) d
    ) g
    left join (
      select date_trunc(v_gran, x.ts)::date as d,
             sum(x.cents) filter (where x.kind = 'new')::bigint as n,
             sum(x.cents) filter (where x.kind = 'renewal')::bigint as rn,
             sum(x.cents) filter (where x.kind = 'upfront')::bigint as u
      from (
        select i.amount_cents as cents,
               (coalesce(i.paid_at, i.created_at) at time zone 'America/Sao_Paulo') as ts,
               case
                 when s.billing_cycle in ('semiannual', 'yearly', 'annual') then 'upfront'
                 when row_number() over (partition by i.subscription_id order by coalesce(i.paid_at, i.created_at)) = 1 then 'new'
                 else 'renewal'
               end as kind
        from public.invoices i
        left join public.subscriptions s on s.id = i.subscription_id
        where i.status = 'paid'
          and (p_module is null or s.module_key = p_module)
      ) x
      where x.ts::date between p_start and p_end
      group by 1
    ) r on r.d = g.d
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_revenue_origin(date, date, text) from public, anon;
grant execute on function public.admin_revenue_origin(date, date, text) to authenticated;

select proname from pg_proc where proname in ('admin_revenue_origin','_admin_dashboard_metrics_base') order by 1;
