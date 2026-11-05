-- 1) Colunas das tabelas do Noah (schemas public e noah)
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema in ('public','noah')
  and (table_name like 'noah%' or table_schema = 'noah')
order by 1,2,ordinal_position;

-- 2) Motivos de termino das respostas (noah_logs.finish_reason)
select finish_reason, count(*) from public.noah_logs group by 1 order by 2 desc;

-- 3) Ultimas 40 perguntas (cortadas em 120 caracteres) para eu classificar os temas
select created_at::date as dia, left(user_message, 120) as pergunta
from public.noah_logs
where user_message is not null
order by created_at desc limit 40;

-- 4) Uso por finalidade no usage_log
select purpose, source, count(*) from noah.usage_log group by 1,2 order by 3 desc;

-- 5) Tabelas de apoio existentes (votos, cooldowns, eventos)
select table_schema, table_name from information_schema.tables
where table_schema in ('public','noah')
  and (table_name like '%noah%' or table_name like '%cooldown%' or table_name like '%vote%' or table_name like '%feedback%')
order by 1,2;

-- 6) Funcoes de metricas do Noah
select n.nspname as schema, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname like '%noah%' and n.nspname in ('public','noah')
order by 1,2;