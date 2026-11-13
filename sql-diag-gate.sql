-- Estado do script da Yampi
select script_id, script_gate, script_updated_at
from public.yampi_connections
where store_id = '955ce943-52b4-4876-802c-e4afe5e9c4c8';

-- Campanhas do Pulse (precisa de enabled = true e ends_at no futuro)
select *
from pulse.gates
where store_id = '955ce943-52b4-4876-802c-e4afe5e9c4c8';