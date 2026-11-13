-- 1) Constraint de event_type (precisa listar cta_click)
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.store_activity_events'::regclass and contype = 'c';

-- 2) Eventos das ultimas 24h por tipo
select event_type, count(*) as qtd, max(created_at) as ultimo
from public.store_activity_events
where created_at > now() - interval '1 day'
group by 1
order by 3 desc;

-- 3) Ultimos cta_click gravados
select id, store_id, video_id, created_at, metadata->>'page_url' as pagina
from public.store_activity_events
where event_type = 'cta_click'
order by created_at desc
limit 5;

-- 4) RPC nova existe?
select proname from pg_proc where proname in ('get_video_click_totals', 'get_video_event_metrics');