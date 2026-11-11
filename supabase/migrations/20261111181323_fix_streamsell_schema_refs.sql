do $$
declare r record;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'streamsell' and p.prosrc ilike '%live_commerce.%'
  loop
    execute replace(pg_get_functiondef(r.oid), 'live_commerce.', 'streamsell.');
  end loop;
end $$;
notify pgrst, 'reload schema';
