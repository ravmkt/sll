-- Rode no SQL Editor (projeto SLL) e envie o resultado

-- Interruptor "Aplicativo ativado" do Pulse (false = gate-status responde inactive)
select public.get_module_app_enabled('955ce943-52b4-4876-802c-e4afe5e9c4c8'::uuid, 'pulse') as pulse_app_enabled;

-- Tipo da coluna domains e filtro usado pelo gate-status
select data_type, udt_name
from information_schema.columns
where table_schema = 'pulse' and table_name = 'gates' and column_name = 'domains';

select id, enabled, starts_at <= now() as iniciou, now() < ends_at as nao_expirou
from pulse.gates
where domains @> array['useanny.com'];

-- Estado do script instalado na Yampi
select script_id, script_gate, script_updated_at
from public.yampi_connections
where store_id = '955ce943-52b4-4876-802c-e4afe5e9c4c8';