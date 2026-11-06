-- Aba Indicacoes do Master: ignora comissoes canceladas (estornadas) na soma
do $do$
declare
  r record;
  d text;
  n int := 0;
  old_s text := 'to_jsonb(rw)->>''referred_store_id'' = c.id::text';
  new_s text := 'to_jsonb(rw)->>''referred_store_id'' = c.id::text and coalesce(to_jsonb(rw)->>''status'','''') <> ''canceled''';
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and position(old_s in p.prosrc) > 0
  loop
    d := pg_get_functiondef(r.oid);
    if position(new_s in d) = 0 then
      execute replace(d, old_s, new_s);
      n := n + 1;
      raise notice 'Funcao atualizada: %', r.oid::regprocedure;
    end if;
  end loop;

  if n = 0 and not exists (
    select 1 from pg_proc where position(new_s in prosrc) > 0
  ) then
    raise exception 'Nenhuma funcao com a consulta de comissao encontrada. Nada alterado.';
  end if;
end
$do$;