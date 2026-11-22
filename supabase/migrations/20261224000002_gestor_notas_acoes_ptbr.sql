-- Notas fiscais: alinha as acoes com a matriz de Usuarios (ver, criar, editar).
-- Reescreve funcoes e policies gestor_nf_* a partir do proprio catalogo do banco.
do $$
declare
  r record; d text; n text; q text; c text; pol text;
begin
  -- funcoes
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname like 'gestor\_nf\_%'
  loop
    d := pg_get_functiondef(r.oid);
    n := regexp_replace(d, '(''notas_fiscais''\s*,\s*)''view''', '\1''ver''', 'g');
    if r.proname = 'gestor_nf_register_manual' then
      n := regexp_replace(n, '(''notas_fiscais''\s*,\s*)''edit''', '\1''criar''', 'g');
    else
      n := regexp_replace(n, '(''notas_fiscais''\s*,\s*)''edit''', '\1''editar''', 'g');
    end if;
    if n <> d then
      execute n;
      raise notice 'funcao atualizada: %', r.proname;
    end if;
  end loop;

  -- policies
  for r in
    select * from pg_policies
    where schemaname = 'public' and tablename like 'gestor\_nf\_%'
  loop
    q := r.qual; c := r.with_check;
    if coalesce(q, '') like '%''view''%' or coalesce(c, '') like '%''view''%'
       or coalesce(q, '') like '%''edit''%' or coalesce(c, '') like '%''edit''%' then
      q := replace(replace(q, '''view''', '''ver'''), '''edit''', '''editar''');
      c := replace(replace(c, '''view''', '''ver'''), '''edit''', '''editar''');
      execute format('drop policy %I on public.%I', r.policyname, r.tablename);
      pol := format('create policy %I on public.%I as %s for %s to %s',
        r.policyname, r.tablename, lower(r.permissive), r.cmd, array_to_string(r.roles, ','));
      if q is not null then pol := pol || ' using (' || q || ')'; end if;
      if c is not null then pol := pol || ' with check (' || c || ')'; end if;
      execute pol;
      raise notice 'policy atualizada: %.%', r.tablename, r.policyname;
    end if;
  end loop;
end $$;