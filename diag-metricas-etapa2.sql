-- A) Colunas reais (schemas dos modulos + eventos)
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema in ('live_commerce','vidlytics')
   or (table_schema='public' and table_name in ('store_activity_events','sll_conversions'))
order by 1,2,ordinal_position;

-- B) Volume por tabela
select schemaname, relname, n_live_tup
from pg_stat_user_tables
where schemaname in ('live_commerce','vidlytics') or relname = 'store_activity_events'
order by n_live_tup desc;

-- C) Tipos de evento
select event_type, count(*), min(created_at), max(created_at)
from public.store_activity_events group by 1 order by 2 desc;

-- D) Vendas por modulo e status
select module, status, count(*), sum(total)
from public.sll_conversions group by 1,2 order by 3 desc;

-- E) Status das lives
select status, count(*) from live_commerce.lives group by 1 order by 2 desc;
