-- 1) Codigo real das RPCs (cole o resultado no chat)
select p.proname, pg_get_functiondef(p.oid) as def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_video_event_metrics', 'get_video_click_stats', 'get_video_retention_curve');

-- 2) Eventos do video de teste (view e clique), com e sem visitor_id
select event_type,
       created_at at time zone 'America/Sao_Paulo' as hora_local,
       (created_at at time zone 'America/Sao_Paulo')::date as dia_local,
       (created_at at time zone 'UTC')::date as dia_utc,
       visitor_id
from public.store_activity_events
where store_id = '955ce943-52b4-4876-802c-e4afe5e9c4c8'
  and video_id = '0caa2f1b-9648-4b75-8fb8-19c2b21bd6df'
  and event_type in ('video_view', 'cta_click')
order by created_at desc
limit 80;

-- 3) Resumo: total bruto x unico x sem visitor_id, por dia local
select (created_at at time zone 'America/Sao_Paulo')::date as dia_local,
       event_type,
       count(*) as bruto,
       count(distinct visitor_id) as visitantes_unicos,
       count(*) filter (where visitor_id is null) as sem_visitor_id
from public.store_activity_events
where store_id = '955ce943-52b4-4876-802c-e4afe5e9c4c8'
  and video_id = '0caa2f1b-9648-4b75-8fb8-19c2b21bd6df'
  and event_type in ('video_view', 'cta_click')
group by 1, 2
order by 1 desc, 2;