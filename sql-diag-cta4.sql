-- 1) A constraint ja aceita cta_click?
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conname = 'check_valid_event_type';

-- 2) Eventos gravados por tipo
select event_type, count(*) as qtd, max(created_at) as ultimo
from public.store_activity_events
group by 1
order by 3 desc;

-- 3) Funcoes relacionadas a cliques/metricas
select proname, pg_get_functiondef(p.oid) as def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (proname ilike '%click%' or proname ilike '%video_event_metrics%');