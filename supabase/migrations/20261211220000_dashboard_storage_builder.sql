do $do$
declare
  f regprocedure := to_regprocedure('public.admin_dashboard_metrics(date,date,text)');
  d text;
  o text := $a$'consumption', (v -> 'consumption') || jsonb_build_object('views', total),$a$;
  n text := $b$'consumption', (v -> 'consumption') || jsonb_build_object('views', total, 'storage_bytes', coalesce((v -> 'consumption' ->> 'storage_bytes')::bigint, 0) + (select coalesce(sum(builder_storage_bytes), 0)::bigint from public.stores)),$b$;
begin
  if f is null then
    raise warning 'funcao admin_dashboard_metrics nao existe';
    return;
  end if;
  d := pg_get_functiondef(f);
  if position('builder_storage_bytes' in d) > 0 then
    raise notice 'ja atualizada';
  elsif position(o in d) = 0 then
    raise warning 'trecho nao encontrado, nada alterado';
  else
    execute replace(d, o, n);
    raise notice 'atualizada: admin_dashboard_metrics';
  end if;
end
$do$;

-- Conferencia: deve listar a funcao
select p.oid::regprocedure as funcao
from pg_proc p
where p.proname = 'admin_dashboard_metrics'
  and pg_get_functiondef(p.oid) like '%builder_storage_bytes%';