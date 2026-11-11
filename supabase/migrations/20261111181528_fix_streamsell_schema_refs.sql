do $$
declare r record;
begin
  for r in
    select p.oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.prosrc ilike '%live_commerce.%'
      and (
        n.nspname = 'streamsell'
        or (n.nspname = 'public' and p.proname in (
          'admin_comunicacao_metrics','admin_benchmarks_metrics',
          'admin_ativacao_metrics','admin_streamsell_metrics'))
      )
  loop
    execute replace(pg_get_functiondef(r.oid), 'live_commerce.', 'streamsell.');
  end loop;
end $$;

notify pgrst, 'reload schema';
