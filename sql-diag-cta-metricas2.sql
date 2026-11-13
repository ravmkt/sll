-- Rode no SQL Editor (projeto SLL) e envie o resultado.
select table_schema, table_name, column_name, data_type
from information_schema.columns
where (table_schema = 'vidlytics' and table_name in ('vid_daily_video_metrics'))
   or (table_schema = 'public' and table_name in ('tracking_events', 'vid_events', 'video_events', 'store_activity_events'))
order by table_schema, table_name, ordinal_position;

select event_type, count(*) from public.tracking_events
where created_at > now() - interval '30 days' group by 1 order by 2 desc;

select p.oid::regprocedure as assinatura, pg_get_functiondef(p.oid) as definicao
from pg_proc p
where p.proname in ('get_video_click_stats', 'get_video_performance', 'get_store_video_metrics', 'refresh_vid_daily_video_metrics');