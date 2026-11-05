create or replace function public._admin_bm_status(v numeric, mn numeric, mx numeric, enough boolean)
returns text language sql immutable as $$
  select case
    when v is null or mn is null or mx is null or not coalesce(enough, false) then 'sem_dados'
    when v < mn then 'abaixo'
    when v > mx then 'acima'
    else 'dentro' end
$$;

create or replace function public.admin_benchmarks_metrics(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, live_commerce, pg_temp
as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  v_setores jsonb;
  v_lojas jsonb;
  v_cron jsonb;
  v_falhas jsonb := '[]'::jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sector_id', b.sector_id,
    'setor', b.sector_name,
    'atualizado_em', b.updated_at,
    'idade_dias', case when b.updated_at is null then null else extract(day from now() - b.updated_at)::int end,
    'fonte', b.source_reference,
    'incompleto', (b.conversion_rate_min is null or b.conversion_rate_max is null
                or b.video_ctr_min is null or b.video_ctr_max is null
                or b.ticket_avg_min is null or b.ticket_avg_max is null),
    'anos_historico', (select count(*) from public.sector_benchmarks_history h where h.sector_id = b.sector_id),
    'lojas', (select count(*) from public.stores s where s.sector_id = b.sector_id)
  ) order by b.sector_name), '[]'::jsonb)
  into v_setores
  from public.sector_benchmarks b;

  with ev as (
    select e.store_id,
           count(*) filter (where e.event_type = 'view') as views,
           count(*) filter (where e.event_type = 'product_click') as cliques
    from live_commerce.live_events e
    where e.created_at >= v_from and e.store_id is not null
    group by e.store_id
  ), cv as (
    select c.store_id, count(*) as pedidos, avg(c.total) as ticket
    from public.sll_conversions c
    where c.created_at >= v_from
      and lower(coalesce(c.status, 'paid')) in ('paid', 'approved', 'pago', 'completed')
    group by c.store_id
  ), q as (
    select s.id, s.name, coalesce(b.sector_name, s.sector) as setor,
           coalesce(ev.views, 0) as views, coalesce(ev.cliques, 0) as cliques, coalesce(cv.pedidos, 0) as pedidos,
           case when coalesce(ev.views, 0) > 0 then round(ev.cliques::numeric * 100 / ev.views, 2) end as ctr,
           case when coalesce(ev.views, 0) > 0 then round(coalesce(cv.pedidos, 0)::numeric * 100 / ev.views, 2) end as conv,
           round(cv.ticket, 2) as ticket,
           b.video_ctr_min, b.video_ctr_max, b.conversion_rate_min, b.conversion_rate_max,
           b.ticket_avg_min, b.ticket_avg_max
    from public.stores s
    left join public.sector_benchmarks b on b.sector_id = s.sector_id
    left join ev on ev.store_id = s.id
    left join cv on cv.store_id = s.id
    where coalesce(s.active, true)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'store_id', q.id, 'loja', q.name, 'setor', q.setor,
    'views', q.views, 'cliques', q.cliques, 'pedidos', q.pedidos,
    'ctr', q.ctr, 'conv', q.conv, 'ticket', q.ticket,
    'ctr_min', q.video_ctr_min, 'ctr_max', q.video_ctr_max,
    'conv_min', q.conversion_rate_min, 'conv_max', q.conversion_rate_max,
    'ticket_min', q.ticket_avg_min, 'ticket_max', q.ticket_avg_max,
    'status_ctr', public._admin_bm_status(q.ctr, q.video_ctr_min, q.video_ctr_max, q.views >= 50),
    'status_conv', public._admin_bm_status(q.conv, q.conversion_rate_min, q.conversion_rate_max, q.views >= 50),
    'status_ticket', public._admin_bm_status(q.ticket, q.ticket_avg_min, q.ticket_avg_max, q.pedidos >= 1)
  ) order by q.name), '[]'::jsonb)
  into v_lojas
  from q;

  begin
    select jsonb_build_object(
      'jobs', (select count(*) from cron.job where jobname like 'benchmarks-%'),
      'ativos', (select count(*) from cron.job where jobname like 'benchmarks-%' and active),
      'execucoes', (select count(*) from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname like 'benchmarks-%'),
      'ultima', (select max(d.start_time) from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname like 'benchmarks-%')
    ) into v_cron;

    select coalesce(jsonb_agg(t.r order by t.quando desc), '[]'::jsonb)
    into v_falhas
    from (
      select d.start_time as quando,
             jsonb_build_object('job', j.jobname, 'quando', d.start_time, 'status', d.status,
                                'mensagem', left(coalesce(d.return_message, ''), 200)) as r
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where j.jobname like 'benchmarks-%' and d.status <> 'succeeded'
        and d.start_time >= now() - interval '400 days'
      order by d.start_time desc
      limit 20
    ) t;
  exception when others then
    v_cron := jsonb_build_object('erro', sqlerrm);
    v_falhas := '[]'::jsonb;
  end;

  return jsonb_build_object(
    'periodo_dias', p_days,
    'setores', v_setores,
    'lojas', v_lojas,
    'cron', v_cron,
    'cron_falhas', v_falhas,
    'historico_total', (select count(*) from public.sector_benchmarks_history)
  );
end;
$$;

revoke all on function public.admin_benchmarks_metrics(int) from public, anon;
grant execute on function public.admin_benchmarks_metrics(int) to authenticated;