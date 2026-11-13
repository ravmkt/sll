-- 1) Colunas da tabela de eventos
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'store_activity_events'
order by ordinal_position;

-- 2) Ultimos eventos (metadata mostra se ja existe algum id de visitante/sessao)
select event_type, video_id, created_at, metadata
from public.store_activity_events
order by created_at desc
limit 15;