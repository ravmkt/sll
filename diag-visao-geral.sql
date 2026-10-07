select 'sll_conversions_cols' as k, jsonb_agg(column_name::text) as v
from information_schema.columns where table_schema='public' and table_name='sll_conversions'
union all
select 'comments_cols', jsonb_agg(column_name::text)
from information_schema.columns where table_schema='public' and table_name='comments'
union all
select 'event_types', jsonb_agg(e)
from (select event_type || ': ' || count(*) as e from public.store_activity_events group by event_type order by count(*) desc) x;