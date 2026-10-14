create or replace function public.admin_saas_health()
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
  v_near jsonb; v_pd jsonb; v_ns jsonb; v_rev jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  -- MRR: planos dinamicos e legados, ciclo convertido para mensal
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
  ) x;

  -- Add-ons ativos
  select coalesce(sum(ad.price_monthly_cents * sa.quantity), 0) into v_addon
  from public.subscription_addons sa
  join public.plan_addons ad on ad.id = sa.addon_id
  join public.subscriptions s on s.id = sa.subscription_id
  where s.is_current and s.status = 'active';

  select v_addon + coalesce(sum(round(a.price_monthly * 100) * sa.quantity), 0) into v_addon
  from public.store_addons sa
  join public.addons a on a.id = sa.addon_id
  where sa.status = 'active'
    and exists (select 1 from public.subscriptions s where s.store_id = sa.store_id and s.is_current and s.status = 'active');

  v_mrr := v_mrr + v_addon;

  -- Churn: lojas que pagaram, cancelaram nos ultimos 30 dias e nao tem outra assinatura viva
  select count(distinct s.store_id) into v_churn
  from public.subscriptions s
  where s.status = 'canceled' and s.canceled_at >= now() - interval '30 days'
    and exists (select 1 from public.invoices i where i.subscription_id = s.id and i.paid_at is not null)
    and not exists (select 1 from public.subscriptions a where a.store_id = s.store_id and a.is_current and a.status in ('active', 'lifetime', 'past_due'));

  -- Conversao de trial (trials encerrados nos ultimos 90 dias)
  select count(*), count(*) filter (where exists (select 1 from public.invoices i where i.store_id = st.id and i.paid_at is not null))
    into v_te, v_tc
  from public.stores st
  where st.trial_ends_at is not null and st.trial_ends_at < now() and st.created_at >= now() - interval '90 days';

  -- Alerta: perto do limite
  select coalesce(jsonb_agg(t order by t.pct desc), '[]'::jsonb) into v_near from (
    select * from (
      select st.id, st.name, 'Armazenamento'::text as what,
             round(100.0 * st.storage_used_bytes / st.storage_limit_bytes)::int as pct
      from public.stores st
      where coalesce(st.storage_limit_bytes, 0) > 0 and st.storage_used_bytes >= 0.9 * st.storage_limit_bytes
      union all
      select st.id, st.name, 'Visualizações'::text, round(100.0 * v.used / l.lim)::int
      from public.stores st
      cross join lateral (select (public._module_limits(st.id, 'vidlytics') ->> 'views')::numeric as lim) l
      cross join lateral (
        select coalesce(sum(m.views_count), 0) as used from public.daily_video_metrics m
        where m.store_id::text = st.id::text and m."date" >= date_trunc('month', now())::date
      ) v
      where l.lim > 0 and v.used >= 0.9 * l.lim
    ) u order by pct desc limit 8
  ) t;

  -- Alerta: pagamento em atraso
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_pd from (
    select st.id, st.name, 'Pagamento em atraso'::text as what,
           greatest(0, extract(day from now() - coalesce(st.past_due_since, now()))::int) as days
    from public.stores st
    where exists (select 1 from public.subscriptions s where s.store_id = st.id and s.is_current and s.status = 'past_due')
    order by st.past_due_since nulls last limit 8
  ) t;

  -- Alerta: assinou ha mais de 48h e nunca enviou evento (script nao instalado)
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_ns from (
    select st.id, st.name, 'Script não instalado'::text as what,
           extract(day from now() - st.created_at)::int as days
    from public.stores st
    where st.created_at < now() - interval '48 hours'
      and exists (select 1 from public.subscriptions s where s.store_id = st.id and s.is_current and s.status in ('active', 'trialing'))
      and not exists (select 1 from public.store_activity_events e where e.store_id::text = st.id::text)
    order by st.created_at limit 8
  ) t;

  -- Receita por origem, ultimos 30 dias (Brasilia)
  select coalesce(jsonb_agg(r order by r.d), '[]'::jsonb) into v_rev from (
    select to_char(g.d::date, 'YYYY-MM-DD') as d,
           coalesce(sum(c.amount_cents) filter (where c.o = 'new'), 0) as "new",
           coalesce(sum(c.amount_cents) filter (where c.o = 'renewal'), 0) as renewal,
           coalesce(sum(c.amount_cents) filter (where c.o = 'upfront'), 0) as upfront
    from generate_series((now() at time zone 'America/Sao_Paulo')::date - 29, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') g(d)
    left join (
      select (p.at at time zone 'America/Sao_Paulo')::date as d, p.amount_cents,
             case when p.rn > 1 then 'renewal'
                  when p.billing_cycle in ('yearly', 'annual', 'semiannual') then 'upfront'
                  else 'new' end as o
      from (
        select i.amount_cents, coalesce(i.paid_at, i.created_at) as at, s.billing_cycle,
               row_number() over (partition by coalesce(i.subscription_id::text, i.id::text) order by coalesce(i.paid_at, i.created_at)) as rn
        from public.invoices i
        left join public.subscriptions s on s.id = i.subscription_id
        where i.status = 'paid'
      ) p
      where p.at >= now() - interval '31 days'
    ) c on c.d = g.d::date
    group by g.d
  ) r;

  return jsonb_build_object(
    'mrr_cents', round(v_mrr)::bigint,
    'addon_mrr_cents', round(v_addon)::bigint,
    'active_stores', v_active,
    'arpu_cents', case when v_active > 0 then round(v_mrr / v_active)::bigint else 0 end,
    'churn_30d', v_churn,
    'trial_ended', v_te,
    'trial_converted', v_tc,
    'alerts', jsonb_build_object('near_limit', v_near, 'past_due', v_pd, 'no_script', v_ns),
    'revenue_origin', v_rev
  );
end;
$$;

revoke all on function public.admin_saas_health() from public, anon;
grant execute on function public.admin_saas_health() to authenticated;

select proname from pg_proc where proname = 'admin_saas_health';