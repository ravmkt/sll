create or replace function public._sub_in_module(s public.subscriptions, p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_module is null
    or s.module_key = p_module
    or exists (select 1 from public.dynamic_plans dp where dp.id = s.dynamic_plan_id and dp.module_slug = p_module)
    or exists (select 1 from public.combo_modules cm where cm.plan_id = s.dynamic_plan_id and cm.module_slug = p_module)
    or (coalesce(s.module_key, 'bundle') = 'bundle'
        and exists (select 1 from public.plans p where p.id = s.plan_id and to_jsonb(p.modules) ? p_module));
$$;
revoke all on function public._sub_in_module(public.subscriptions, text) from public, anon, authenticated;

create or replace function public.admin_saas_health(p_start date, p_end date, p_module text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mrr numeric := 0;
  v_addon numeric := 0;
  v_active int := 0;
  v_churn int := 0;
  v_te int := 0;
  v_tc int := 0;
  v_near jsonb; v_pd jsonb; v_ns jsonb;
  v_vid boolean := (p_module is null or p_module = 'vidlytics');
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select coalesce(sum(x.mrr), 0), count(distinct x.store_id) into v_mrr, v_active
  from (
    select s.store_id,
      case
        when s.dynamic_plan_id is not null then
          case s.billing_cycle
            when 'semiannual' then dp.price_semiannual_cents / 6.0
            when 'yearly' then dp.price_annual_cents / 12.0
            when 'annual' then dp.price_annual_cents / 12.0
            else dp.price_monthly_cents::numeric end
        else
          coalesce(
            cp.price_cents::numeric / case s.billing_cycle when 'semiannual' then 6 when 'yearly' then 12 when 'annual' then 12 else 1 end,
            p.price_cents::numeric, 0)
      end as mrr
    from public.subscriptions s
    left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
    left join public.plans p on p.id = s.plan_id
    left join lateral (
      select pp.price_cents from public.plan_prices pp
      where pp.plan_id = s.plan_id and pp.billing_cycle = s.billing_cycle and pp.is_active limit 1
    ) cp on true
    where s.is_current = true and s.status = 'active'
      and public._sub_in_module(s, p_module)
  ) x;

  select coalesce(sum(ad.price_monthly_cents * sa.quantity), 0) into v_addon
  from public.subscription_addons sa
  join public.plan_addons ad on ad.id = sa.addon_id
  join public.subscriptions s on s.id = sa.subscription_id
  where s.is_current and s.status = 'active'
    and (p_module is null or ad.module_slug = p_module);

  select v_addon + coalesce(sum(round(a.price_monthly * 100) * sa.quantity), 0) into v_addon
  from public.store_addons sa
  join public.addons a on a.id = sa.addon_id
  where p_module is null
    and sa.status = 'active'
    and exists (select 1 from public.subscriptions s where s.store_id = sa.store_id and s.is_current and s.status = 'active');

  v_mrr := v_mrr + v_addon;

  select count(distinct s.store_id) into v_churn
  from public.subscriptions s
  where s.status = 'canceled'
    and (s.canceled_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
    and public._sub_in_module(s, p_module)
    and exists (select 1 from public.invoices i where i.subscription_id = s.id and i.paid_at is not null)
    and not exists (
      select 1 from public.subscriptions a
      where a.store_id = s.store_id and a.is_current and a.status in ('active', 'lifetime', 'past_due')
        and public._sub_in_module(a, p_module));

  select count(*),
         count(*) filter (where exists (
           select 1 from public.invoices i
           left join public.subscriptions x on x.id = i.subscription_id
           where i.store_id = st.id and i.paid_at is not null
             and (p_module is null or (x.id is not null and public._sub_in_module(x, p_module)))))
    into v_te, v_tc
  from public.stores st
  where st.trial_ends_at is not null and st.trial_ends_at < now()
    and (st.trial_ends_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
    and (p_module is null or exists (select 1 from public.subscriptions x where x.store_id = st.id and public._sub_in_module(x, p_module)));

  select coalesce(jsonb_agg(t order by t.pct desc), '[]'::jsonb) into v_near from (
    select * from (
      select st.id, st.name, 'Armazenamento'::text as what,
             round(100.0 * st.storage_used_bytes / st.storage_limit_bytes)::int as pct
      from public.stores st
      where v_vid
        and coalesce(st.storage_limit_bytes, 0) > 0 and st.storage_used_bytes >= 0.9 * st.storage_limit_bytes
        and (p_module is null or exists (select 1 from public.subscriptions s where s.store_id = st.id and s.is_current and public._sub_in_module(s, p_module)))
      union all
      select st.id, st.name, 'Visualizações'::text, round(100.0 * v.used / l.lim)::int
      from public.stores st
      cross join lateral (select (public._module_limits(st.id, 'vidlytics') ->> 'views')::numeric as lim) l
      cross join lateral (
        select count(*)::numeric as used from public.store_activity_events e
        where e.store_id::text = st.id::text and e.event_type = 'video_view'
          and e.created_at >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
      ) v
      where v_vid and l.lim > 0 and v.used >= 0.9 * l.lim
        and (p_module is null or exists (select 1 from public.subscriptions s where s.store_id = st.id and s.is_current and public._sub_in_module(s, p_module)))
    ) u order by pct desc limit 8
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_pd from (
    select st.id, st.name, 'Pagamento em atraso'::text as what,
           greatest(0, extract(day from now() - coalesce(st.past_due_since, now()))::int) as days
    from public.stores st
    where exists (select 1 from public.subscriptions s
                  where s.store_id = st.id and s.is_current and s.status = 'past_due' and public._sub_in_module(s, p_module))
    order by st.past_due_since nulls last limit 8
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_ns from (
    select st.id, st.name, 'Script não instalado'::text as what,
           extract(day from now() - st.created_at)::int as days
    from public.stores st
    where v_vid
      and st.created_at < now() - interval '48 hours'
      and exists (select 1 from public.subscriptions s
                  where s.store_id = st.id and s.is_current and s.status in ('active', 'trialing') and public._sub_in_module(s, p_module))
      and not exists (select 1 from public.store_activity_events e where e.store_id::text = st.id::text)
    order by st.created_at limit 8
  ) t;

  return jsonb_build_object(
    'mrr_cents', round(v_mrr)::bigint,
    'addon_mrr_cents', round(v_addon)::bigint,
    'active_stores', v_active,
    'arpu_cents', case when v_active > 0 then round(v_mrr / v_active)::bigint else 0 end,
    'churn_30d', v_churn,
    'trial_ended', v_te,
    'trial_converted', v_tc,
    'alerts', jsonb_build_object('near_limit', v_near, 'past_due', v_pd, 'no_script', v_ns)
  );
end;
$$;
revoke all on function public.admin_saas_health(date, date, text) from public, anon;
grant execute on function public.admin_saas_health(date, date, text) to authenticated;

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
          and (p_module is null or (s.id is not null and public._sub_in_module(s, p_module)))
      ) x
      where x.ts::date between p_start and p_end
      group by 1
    ) r on r.d = g.d
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_revenue_origin(date, date, text) from public, anon;
grant execute on function public.admin_revenue_origin(date, date, text) to authenticated;

select proname from pg_proc where proname in ('_sub_in_module', 'admin_saas_health', 'admin_revenue_origin') order by 1;