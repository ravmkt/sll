-- Rode no SQL Editor (projeto SLL) e envie o resultado.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name in ('stores', 'yampi_connections')
order by table_name, ordinal_position;