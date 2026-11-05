-- A) Colunas reais das tabelas relevantes
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema not in ('pg_catalog','information_schema','auth','storage','realtime','vault','extensions','graphql','graphql_public','pgsodium','supabase_functions','net','cron')
  and table_name ~ '(store|subscr|trial|invoice|plan|addon|combo|live|sll_|noah|ai_|onboard|tour|script|widget|affiliate|withdraw|feature_request|feedback|nps|benchmark|notify|vid_|cancel|lead)'
order by table_schema, table_name, ordinal_position;

-- B) Volume de linhas por tabela (estimado)
select schemaname, relname, n_live_tup
from pg_stat_user_tables
where schemaname not in ('auth','storage','realtime','vault','extensions','cron','net')
order by n_live_tup desc
limit 80;

-- C) Valores distintos de status/modulo/tipo nas tabelas principais
select 'sll_conversions.module' as campo, module::text as valor, count(*) from public.sll_conversions group by 2
union all select 'app_feedbacks.type', type::text, count(*) from public.app_feedbacks group by 2
union all select 'feature_requests.status', status::text, count(*) from public.feature_requests group by 2
order by 1, 3 desc;
