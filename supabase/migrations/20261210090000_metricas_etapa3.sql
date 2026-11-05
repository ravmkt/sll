-- Metricas Etapa 3: receita, comunicacao e saude tecnica (somente leitura)

create or replace function public.admin_receita_metrics(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_te int; v_tc int; v_days numeric; v_rev bigint;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select count(*), count(*) filter (where exists (select 1 from public.invoices i where i.store_id = st.id and i.paid_at is not null))
    into v_te, v_tc
  from public.stores st
  where st.trial_ends_at is not null and st.trial_ends_at < now()
    and (st.trial_ends_at at time zone 'America/Sao_Paulo')::date between p_start and p_end;

  select round(avg(extract(epoch from (f.first_paid - st.created_at)) / 86400.0)::numeric, 1) into v_days
  from public.stores st
  join lateral (select min(i.paid_at) as first_paid from public.invoices i where i.store_id = st.id and i.paid_at is not null) f on f.first_paid is not null
  where st.trial_ends_at is not null
    and (f.first_paid at time zone 'America/Sao_Paulo')::date between p_start and p_end;

  select coalesce(sum(i.amount_cents), 0)::bigint into v_rev
  from public.invoices i
  where i.status = 'paid'
    and (coalesce(i.paid_at, i.created_at) at time zone 'America/Sao_Paulo')::date between p_start and p_end;

  return jsonb_build_object(
    'revenue_cents', v_rev,
    'trial_ended', v_te,
    'trial_converted', v_tc,
    'avg_days_to_convert', v_days,
    'by_module', coalesce((select jsonb_agg(t order by t.cents desc) from (
        select coalesce(s.module_key, 'sem assinatura') as key, sum(i.amount_cents)::bigint as cents, count(*)::int as n
        from public.invoices i left join public.subscriptions s on s.id = i.subscription_id
        where i.status = 'paid' and (coalesce(i.paid_at, i.created_at) at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1) t), '[]'::jsonb),
    'by_kind', coalesce((select jsonb_agg(t order by t.cents desc) from (
        select case when s.id is null then 'sem assinatura'
                    when s.combo_kind is not null then 'Combo: ' || s.combo_kind
                    else 'Plano avulso' end as key,
               sum(i.amount_cents)::bigint as cents, count(*)::int as n
        from public.invoices i left join public.subscriptions s on s.id = i.subscription_id
        where i.status = 'paid' and (coalesce(i.paid_at, i.created_at) at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1) t), '[]'::jsonb),
    'addons', coalesce((select jsonb_agg(t order by t.cents desc) from (
        select coalesce(ad.module_slug, 'geral') as key, sum(ad.price_monthly_cents * sa.quantity)::bigint as cents, sum(sa.quantity)::int as qty
        from public.subscription_addons sa
        join public.plan_addons ad on ad.id = sa.addon_id
        join public.subscriptions s on s.id = sa.subscription_id
        where s.is_current and s.status = 'active'
        group by 1) t), '[]'::jsonb),
    'churn_by_module', coalesce((select jsonb_agg(t order by t.n desc) from (
        select coalesce(s.module_key, 'bundle') as key, count(distinct s.store_id)::int as n
        from public.subscriptions s
        where s.status = 'canceled' and (s.canceled_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1) t), '[]'::jsonb),
    'past_due', coalesce((select jsonb_agg(t) from (
        select st.id, st.name, greatest(0, extract(day from now() - coalesce(st.past_due_since, now()))::int) as days
        from public.stores st
        where exists (select 1 from public.subscriptions s where s.store_id = st.id and s.is_current and s.status = 'past_due')
        order by st.past_due_since nulls last limit 15) t), '[]'::jsonb),
    'unpaid_by_status', coalesce((select jsonb_agg(t order by t.n desc) from (
        select i.status, count(*)::int as n, coalesce(sum(i.amount_cents), 0)::bigint as cents
        from public.invoices i
        where i.paid_at is null and i.status <> 'paid'
          and (i.created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1) t), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_receita_metrics(date, date) from public, anon;
grant execute on function public.admin_receita_metrics(date, date) to authenticated;

create or replace function public.admin_comunicacao_metrics(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_total int; v_failed int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select count(*), count(*) filter (where l.error is not null or l.status in ('failed', 'error'))
    into v_total, v_failed
  from live_commerce.live_notification_logs l
  where (l.sent_at at time zone 'America/Sao_Paulo')::date between p_start and p_end;

  return jsonb_build_object(
    'total', v_total,
    'failed', v_failed,
    'leads_total', (select count(*) from live_commerce.live_leads),
    'leads_period', (select count(*) from live_commerce.live_leads
                     where (created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end),
    'optout', (select count(*) from live_commerce.live_leads where unsubscribed is true),
    'whatsapp_enabled', (select count(*) from live_commerce.live_notify_settings where whatsapp_enabled is true),
    'email_enabled', (select count(*) from live_commerce.live_notify_settings where email_enabled is true),
    'by_channel', coalesce((select jsonb_agg(t order by t.n desc) from (
        select l.channel, l.status, count(*)::int as n
        from live_commerce.live_notification_logs l
        where (l.sent_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1, 2) t), '[]'::jsonb),
    'by_trigger', coalesce((select jsonb_agg(t order by t.n desc) from (
        select l."trigger" as trg, count(*)::int as n,
               (count(*) filter (where l.error is not null or l.status in ('failed', 'error')))::int as failed
        from live_commerce.live_notification_logs l
        where (l.sent_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1) t), '[]'::jsonb),
    'top_errors', coalesce((select jsonb_agg(t order by t.n desc) from (
        select left(l.error, 160) as error, count(*)::int as n
        from live_commerce.live_notification_logs l
        where l.error is not null
          and (l.sent_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'connections', coalesce((select jsonb_agg(t order by t.n desc) from (
        select coalesce(s.evolution_status, 'sem conexao') as status, count(*)::int as n
        from live_commerce.live_notify_settings s
        where s.whatsapp_enabled is true group by 1) t), '[]'::jsonb),
    'disconnected', coalesce((select jsonb_agg(t) from (
        select st.name, coalesce(s.evolution_status, 'sem conexao') as status
        from live_commerce.live_notify_settings s join public.stores st on st.id = s.store_id
        where s.whatsapp_enabled is true and coalesce(s.evolution_status, '') not in ('open', 'connected')
        limit 10) t), '[]'::jsonb)
  );
end $$;
revoke all on function public.admin_comunicacao_metrics(date, date) from public, anon;
grant execute on function public.admin_comunicacao_metrics(date, date) to authenticated;

create or replace function public.admin_saude_metrics(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_cron jsonb := '[]'::jsonb; v_ct int; v_last timestamptz;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  begin
    select coalesce(jsonb_agg(t order by t.fails desc, t.job), '[]'::jsonb) into v_cron from (
      select coalesce(j.jobname, d.jobid::text) as job, count(*)::int as runs,
             (count(*) filter (where d.status = 'failed'))::int as fails,
             max(d.start_time) filter (where d.status = 'failed') as last_fail
      from cron.job_run_details d left join cron.job j on j.jobid = d.jobid
      where (d.start_time at time zone 'America/Sao_Paulo')::date between p_start and p_end
      group by 1 order by 3 desc limit 20) t;
  exception when others then v_cron := '[]'::jsonb;
  end;

  select count(*), max(created_at) into v_ct, v_last
  from public.sll_conversions
  where (created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end;

  return jsonb_build_object(
    'stores_total', (select count(*) from public.stores),
    'script_ok', (select count(*) from public.stores where script_verified is true),
    'inactive_7d', (select count(*) from public.stores st
        where exists (select 1 from public.subscriptions s where s.store_id = st.id and s.is_current and s.status in ('active', 'trialing'))
          and (st.last_active_at is null or st.last_active_at < now() - interval '7 days')),
    'paying_no_script', coalesce((select jsonb_agg(t) from (
        select st.name, extract(day from now() - st.created_at)::int as days
        from public.stores st
        where coalesce(st.script_verified, false) = false
          and st.created_at < now() - interval '48 hours'
          and exists (select 1 from public.subscriptions s where s.store_id = st.id and s.is_current and s.status in ('active', 'trialing'))
        order by st.created_at limit 10) t), '[]'::jsonb),
    'storage_used', (select coalesce(sum(storage_used_bytes), 0)::bigint from public.stores),
    'storage_near', coalesce((select jsonb_agg(t order by t.pct desc) from (
        select st.name, round(100.0 * st.storage_used_bytes / st.storage_limit_bytes)::int as pct
        from public.stores st
        where coalesce(st.storage_limit_bytes, 0) > 0 and st.storage_used_bytes >= 0.8 * st.storage_limit_bytes
        order by 2 desc limit 8) t), '[]'::jsonb),
    'db_size_bytes', pg_database_size(current_database()),
    'conv_total', v_ct,
    'conv_last', v_last,
    'conv_by', coalesce((select jsonb_agg(t order by t.n desc) from (
        select coalesce(module, 'sem modulo') as module, coalesce(status, 'sem status') as status, count(*)::int as n,
               coalesce(sum(total), 0) as total
        from public.sll_conversions
        where (created_at at time zone 'America/Sao_Paulo')::date between p_start and p_end
        group by 1, 2) t), '[]'::jsonb),
    'cron', v_cron
  );
end $$;
revoke all on function public.admin_saude_metrics(date, date) from public, anon;
grant execute on function public.admin_saude_metrics(date, date) to authenticated;