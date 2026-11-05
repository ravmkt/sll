-- 1) Tabelas existentes
select table_schema, table_name from information_schema.tables
where table_name in ('invoices','billing_invoices','usage_log','ai_usage_log','noah_logs','ai_usage_all')
order by 1,2;

-- 2) Colunas reais
select table_schema, table_name, column_name, data_type
from information_schema.columns
where (table_schema, table_name) in (('public','invoices'),('public','billing_invoices'),('noah','usage_log'),('public','ai_usage_log'),('public','noah_logs'))
order by 1,2,ordinal_position;

-- 3) Linhas por tabela (so as que existem)
select t, (xpath('/row/c/text()', query_to_xml('select count(*) c from '||t, false, true, '')))[1]::text as linhas
from unnest(array['public.invoices','public.billing_invoices','noah.usage_log','public.ai_usage_log','public.noah_logs']) t
where to_regclass(t) is not null;

-- 4) Faturas por status (billing_invoices)
select status, count(*), sum(amount_cents) from public.billing_invoices group by 1 order by 2 desc;

-- 5) Funcao da Receita
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'admin_receita_metrics';