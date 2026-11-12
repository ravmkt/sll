-- Renomeia o schema gate para pulse (modulo Pulse)
set check_function_bodies = off;

alter schema gate rename to pulse;

-- 1) search_path das funcoes
alter function pulse.enforce_max_gates() set search_path = public, pulse;
alter function pulse.gate_summary(uuid, int) set search_path = pulse;

-- 2) corpo das funcoes: gate.<tabela> -> pulse.<tabela>
do $$
declare r record; def text;
begin
  for r in
    select p.oid from pg_proc p
    where p.pronamespace = 'pulse'::regnamespace and p.prokind = 'f'
  loop
    def := pg_get_functiondef(r.oid);
    if def ~ '(?<![\w.])gate\.' then
      def := regexp_replace(def, '(?<![\w.])gate\.', 'pulse.', 'g');
      execute def;
    end if;
  end loop;
end $$;

-- 3) expor pulse no PostgREST (troca gate por pulse)
do $$
declare cur text; arr text[];
begin
  select substr(c, length('pgrst.db_schemas=') + 1) into cur
  from pg_roles r, unnest(r.rolconfig) c
  where r.rolname = 'authenticator' and c like 'pgrst.db_schemas=%';
  arr := array(
    select trim(x) from unnest(string_to_array(coalesce(cur, 'public, graphql_public'), ',')) x
    where trim(x) <> 'gate'
  );
  if not ('pulse' = any(arr)) then arr := arr || 'pulse'::text; end if;
  execute format('alter role authenticator set pgrst.db_schemas = %L', array_to_string(arr, ', '));
end $$;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
