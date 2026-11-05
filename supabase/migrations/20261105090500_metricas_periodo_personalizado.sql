-- Periodo personalizado (p_start / p_end) nas metricas do Master.
-- Compativel: sem datas, continua valendo p_days.
begin;

drop function if exists public.admin_noah_feedback_metrics(integer);
drop function if exists public.admin_streamsell_metrics(integer);
drop function if exists public.admin_vidlytics_metrics(integer);
drop function if exists public.admin_nps_results(integer, uuid);
drop function if exists public.admin_benchmarks_metrics(integer);

-- ---------------------------------------------------------------
-- Noah (feedback)
-- ---------------------------------------------------------------
create or replace function public.admin_noah_feedback_metrics(
  p_days integer default 30, p_start date default null, p_end date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz := case when p_start is not null
    then (p_start::timestamp at time zone 'America/Sao_Paulo')
    else now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) end;
  v_to timestamptz := case when p_end is not null
    then ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    else 'infinity'::timestamptz end;
  r jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'up', count(*) filter (where vote = 'up'),
    'down', count(*) filter (where vote = 'down'),
    'total', count(*)
  ) into r
  from public.app_feedbacks
  where type = 'noah' and created_at >= v_from and created_at < v_to;

  r := r || jsonb_build_object('daily', coalesce((
    select jsonb_agg(to_jsonb(d) order by d.day)
    from (
      select (created_at at time zone 'America/Sao_Paulo')::date as day,
             count(*) filter (where vote = 'up') as up,
             count(*) filter (where vote = 'down') as down
      from public.app_feedbacks
      where type = 'noah' and created_at >= v_from and created_at < v_to
      group by 1
    ) d
  ), '[]'::jsonb));

  r := r || jsonb_build_object('downs', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select f.created_at, f.store_id, to_jsonb(s)->>'name' as store_name,
             f.comment as question, f.reference_id
      from public.app_feedbacks f
      left join public.stores s on s.id = f.store_id
      where f.type = 'noah' and f.vote = 'down'
        and f.created_at >= v_from and f.created_at < v_to
      order by f.created_at desc
      limit 100
    ) x
  ), '[]'::jsonb));

  return r;
end $function$;

-- ---------------------------------------------------------------
-- Stream Sell
-- ---------------------------------------------------------------
create or replace function public.admin_streamsell_metrics(
  p_days integer default 30, p_start date default null, p_end date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz := case when p_start is not null
    then (p_start::timestamp at time zone 'America/Sao_Paulo')
    else now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) end;
  v_to timestamptz := case when p_end is not null
    then ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    else 'infinity'::timestamptz end;
  r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  with ev as (
    select e.live_id, e.event_type, e.created_at,
           nullif(e.metadata->>'visitor_id', '') as vid
    from live_commerce.live_events e
    where e.created_at >= v_from and e.created_at < v_to
  ),
  lv as (
    select l.id, l.store_id, l.title, l.status, l.started_at, l.peak_viewers
    from live_commerce.lives l
    where coalesce(l.started_at, l.scheduled_at, l.created_at) >= v_from
      and coalesce(l.started_at, l.scheduled_at, l.created_at) < v_to
  ),
  cv as (
    select c.total
    from public.sll_conversions c
    where c.status = 'paid' and c.created_at >= v_from and c.created_at < v_to
      and (c.module ilike '%stream%' or c.module ilike '%live%')
  )
  select jsonb_build_object(
    'subscribers', (select count(distinct s.store_id) from public.subscriptions s
                    where s.module_key = 'live_commerce' and s.is_current and s.status in ('active', 'trialing')),
    'subs_without_live', (select count(distinct s.store_id) from public.subscriptions s
                          where s.module_key = 'live_commerce' and s.is_current and s.status in ('active', 'trialing')
                            and not exists (select 1 from live_commerce.lives l where l.store_id = s.store_id)),
    'stores_with_live', (select count(distinct store_id) from lv),
    'lives_total', (select count(*) from lv),
    'lives_held', (select count(*) from lv where started_at is not null),
    'by_status', coalesce((select jsonb_object_agg(x.st, x.n)
                           from (select coalesce(status, '-') as st, count(*) as n from lv group by 1) x), '{}'::jsonb),
    'peak', (select coalesce(max(peak_viewers), 0) from lv),
    'views_total', (select count(*) from ev where event_type = 'view'),
    'views_unique', (select count(distinct (live_id::text || ':' || vid)) from ev where event_type = 'view' and vid is not null),
    'product_clicks', (select count(*) from ev where event_type = 'product_click'),
    'promo_clicks', (select count(*) from ev where event_type = 'promo_click'),
    'group_clicks', (select count(*) from ev where event_type = 'group_click'),
    'signup_clicks', (select count(*) from ev where event_type = 'signup_click'),
    'share_clicks', (select count(*) from ev where event_type = 'share_click'),
    'chat_messages', (select count(*) from live_commerce.live_chat_messages m
                      where m.created_at >= v_from and m.created_at < v_to
                        and coalesce(m.is_from_store, false) = false),
    'leads', (select count(*) from live_commerce.live_leads
              where created_at >= v_from and created_at < v_to),
    'orders', (select count(*) from cv),
    'revenue', (select coalesce(sum(total), 0) from cv),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', d.v, 'clicks', d.c) order by d.day)
      from (
        select (created_at at time zone 'America/Sao_Paulo')::date as day,
               count(*) filter (where event_type = 'view') as v,
               count(*) filter (where event_type = 'product_click') as c
        from ev group by 1
      ) d), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.views desc)
      from (
        select l.id, l.title, s.name as store, l.status, coalesce(l.peak_viewers, 0) as peak,
               count(*) filter (where e.event_type = 'view') as views,
               count(*) filter (where e.event_type = 'product_click') as clicks
        from lv l
        left join public.stores s on s.id = l.store_id
        left join ev e on e.live_id = l.id
        group by l.id, l.title, s.name, l.status, l.peak_viewers
        order by views desc
        limit 10
      ) t), '[]'::jsonb)
  ) into r;

  return r;
end;
$function$;

-- ---------------------------------------------------------------
-- Vidlytics
-- ---------------------------------------------------------------
create or replace function public.admin_vidlytics_metrics(
  p_days integer default 30, p_start date default null, p_end date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz := case when p_start is not null
    then (p_start::timestamp at time zone 'America/Sao_Paulo')
    else now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) end;
  v_to timestamptz := case when p_end is not null
    then ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    else 'infinity'::timestamptz end;
  r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  with ev as (
    select a.event_type, a.video_id, a.created_at
    from public.store_activity_events a
    where a.created_at >= v_from and a.created_at < v_to
  ),
  subs as (
    select distinct s.store_id
    from public.subscriptions s
    where s.module_key = 'vidlytics' and s.is_current and s.status in ('active', 'trialing')
  ),
  cv as (
    select c.total
    from public.sll_conversions c
    where c.status = 'paid' and c.created_at >= v_from and c.created_at < v_to
      and c.module ilike '%vidlytics%'
  )
  select jsonb_build_object(
    'subscribers', (select count(*) from subs),
    'subs_without_video', (select count(*) from subs
                           where not exists (select 1 from vidlytics.vid_videos v
                                             where v.store_id = subs.store_id and coalesce(v.active, true))),
    'stores_with_video', (select count(distinct store_id) from vidlytics.vid_videos),
    'videos_total', (select count(*) from vidlytics.vid_videos),
    'videos_active', (select count(*) from vidlytics.vid_videos v where coalesce(v.active, true)),
    'storage_bytes', (select coalesce(sum(file_size_bytes), 0) from vidlytics.vid_videos),
    'stories', (select count(*) from vidlytics.vid_stories),
    'views', (select count(*) from ev where event_type in ('video_view', 'view')),
    'plays', (select count(*) from ev where event_type in ('play', 'video_play', 'video_start')),
    'clicks', (select count(*) from ev where event_type in ('product_click', 'whatsapp_click', 'cta_click')),
    'likes', (select count(*) from public.video_likes where created_at >= v_from and created_at < v_to)
           + (select count(*) from vidlytics.vid_video_likes where created_at >= v_from and created_at < v_to),
    'comments', (select count(*) from vidlytics.vid_comments where created_at >= v_from and created_at < v_to),
    'orders', (select count(*) from cv),
    'revenue', (select coalesce(sum(total), 0) from cv),
    'events_by_type', coalesce((select jsonb_object_agg(x.et, x.n)
                                from (select event_type as et, count(*) as n from ev group by 1) x), '{}'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', d.v, 'clicks', d.c) order by d.day)
      from (
        select (created_at at time zone 'America/Sao_Paulo')::date as day,
               count(*) filter (where event_type in ('video_view', 'view')) as v,
               count(*) filter (where event_type in ('product_click', 'whatsapp_click', 'cta_click')) as c
        from ev group by 1
      ) d), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.views desc)
      from (
        select v.id, v.title, s.name as store,
               count(*) filter (where e.event_type in ('video_view', 'view')) as views,
               count(*) filter (where e.event_type in ('product_click', 'whatsapp_click', 'cta_click')) as clicks
        from ev e
        join vidlytics.vid_videos v on v.id = e.video_id
        left join public.stores s on s.id = v.store_id
        group by v.id, v.title, s.name
        order by views desc
        limit 10
      ) t), '[]'::jsonb)
  ) into r;

  return r;
end;
$function$;

-- ---------------------------------------------------------------
-- NPS
-- ---------------------------------------------------------------
create or replace function public.admin_nps_results(
  p_days integer default 90, p_survey_id uuid default null,
  p_start date default null, p_end date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz := case when p_start is not null
    then (p_start::timestamp at time zone 'America/Sao_Paulo')
    else now() - make_interval(days => greatest(coalesce(p_days, 90), 1)) end;
  v_to timestamptz := case when p_end is not null
    then ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    else 'infinity'::timestamptz end;
  v_total int; v_prom int; v_pas int; v_det int;
  v_dist jsonb; v_pains jsonb; v_feats jsonb; v_comments jsonb; v_questions jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select count(score), count(*) filter (where score >= 9),
         count(*) filter (where score between 7 and 8), count(*) filter (where score <= 6)
    into v_total, v_prom, v_pas, v_det
  from public.app_feedbacks
  where type = 'nps_wizard' and created_at >= v_from and created_at < v_to
    and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text);

  select coalesce(jsonb_agg(jsonb_build_object('score', g, 'count', coalesce(c.n, 0)) order by g), '[]'::jsonb)
    into v_dist
  from generate_series(0, 10) g
  left join (select score, count(*) n from public.app_feedbacks
             where type = 'nps_wizard' and created_at >= v_from and created_at < v_to
               and score is not null
               and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text)
             group by score) c on c.score = g;

  select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb) into v_pains
  from (select payload->>'main_pain' k, count(*) n from public.app_feedbacks
        where type = 'nps_wizard' and created_at >= v_from and created_at < v_to
          and payload ? 'main_pain'
          and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text) group by 1) t;

  select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb) into v_feats
  from (select payload->>'top_feature' k, count(*) n from public.app_feedbacks
        where type = 'nps_wizard' and created_at >= v_from and created_at < v_to
          and payload ? 'top_feature'
          and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text) group by 1) t;

  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'total', tot, 'items', items) order by title), '[]'::jsonb)
    into v_questions
  from (
    select t.title, sum(t.n) as tot,
           jsonb_agg(jsonb_build_object('key', t.label, 'count', t.n) order by t.n desc) as items
    from (
      select a->>'title' as title, lb.label, count(*) as n
      from public.app_feedbacks f
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(f.payload->'answers') = 'array' then f.payload->'answers' else '[]'::jsonb end) a
      cross join lateral jsonb_array_elements_text(
        case when jsonb_typeof(a->'labels') = 'array' then a->'labels' else '[]'::jsonb end) as lb(label)
      where f.type = 'nps_wizard' and f.created_at >= v_from and f.created_at < v_to
        and a->>'type' in ('single', 'multi')
        and (p_survey_id is null or f.payload->>'survey_id' = p_survey_id::text)
      group by 1, 2
    ) t
    group by t.title
  ) q;

  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into v_comments
  from (select jsonb_build_object('store', s.name, 'score', f.score, 'comment', f.comment,
               'pain_other', f.payload->>'main_pain_other', 'created_at', f.created_at) x
        from public.app_feedbacks f left join public.stores s on s.id = f.store_id
        where f.type = 'nps_wizard' and f.created_at >= v_from and f.created_at < v_to
          and (p_survey_id is null or f.payload->>'survey_id' = p_survey_id::text)
          and (f.comment is not null or f.payload ? 'main_pain_other')
        order by f.created_at desc limit 50) t;

  return jsonb_build_object(
    'total', v_total, 'promoters', v_prom, 'passives', v_pas, 'detractors', v_det,
    'nps', case when v_total = 0 then null else round(100.0 * (v_prom - v_det) / v_total)::int end,
    'distribution', v_dist, 'pains', v_pains, 'features', v_feats,
    'questions', v_questions, 'comments', v_comments);
end $function$;

-- ---------------------------------------------------------------
-- Benchmarks
-- ---------------------------------------------------------------
create or replace function public.admin_benchmarks_metrics(
  p_days integer default 30, p_start date default null, p_end date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'live_commerce', 'pg_temp'
as $function$
declare
  v_from timestamptz := case when p_start is not null
    then (p_start::timestamp at time zone 'America/Sao_Paulo')
    else now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) end;
  v_to timestamptz := case when p_end is not null
    then ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    else 'infinity'::timestamptz end;
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
    where e.created_at >= v_from and e.created_at < v_to and e.store_id is not null
    group by e.store_id
  ), cv as (
    select c.store_id, count(*) as pedidos, avg(c.total) as ticket
    from public.sll_conversions c
    where c.created_at >= v_from and c.created_at < v_to
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
    'inicio', p_start,
    'fim', p_end,
    'setores', v_setores,
    'lojas', v_lojas,
    'cron', v_cron,
    'cron_falhas', v_falhas,
    'historico_total', (select count(*) from public.sector_benchmarks_history)
  );
end;
$function$;

-- ---------------------------------------------------------------
-- Permissoes (so usuario logado; a propria funcao exige superadmin)
-- ---------------------------------------------------------------
revoke all on function public.admin_noah_feedback_metrics(integer, date, date) from public, anon;
revoke all on function public.admin_streamsell_metrics(integer, date, date) from public, anon;
revoke all on function public.admin_vidlytics_metrics(integer, date, date) from public, anon;
revoke all on function public.admin_nps_results(integer, uuid, date, date) from public, anon;
revoke all on function public.admin_benchmarks_metrics(integer, date, date) from public, anon;

grant execute on function public.admin_noah_feedback_metrics(integer, date, date) to authenticated, service_role;
grant execute on function public.admin_streamsell_metrics(integer, date, date) to authenticated, service_role;
grant execute on function public.admin_vidlytics_metrics(integer, date, date) to authenticated, service_role;
grant execute on function public.admin_nps_results(integer, uuid, date, date) to authenticated, service_role;
grant execute on function public.admin_benchmarks_metrics(integer, date, date) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;