do $$
declare r record; cfg text;
begin
  for r in
    select p.oid::regprocedure as sig, c as cfg
    from pg_proc p, unnest(p.proconfig) c
    where c ilike 'search_path=%live_commerce%'
  loop
    execute format('alter function %s set search_path = %s',
      r.sig, replace(substr(r.cfg, 13), 'live_commerce', 'streamsell'));
  end loop;
end $$;

revoke select on public.admin_superusers from anon;

notify pgrst, 'reload schema';
