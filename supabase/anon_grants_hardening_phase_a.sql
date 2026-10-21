begin;

do $$
declare r record;
begin
  for r in
    select n.nspname s, c.relname t,
           exists (select 1 from pg_policies p
                   where p.schemaname = n.nspname and p.tablename = c.relname
                     and p.roles && array['anon','public']::name[]) has_anon_policy
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p') and n.nspname in ('public','vidlytics','live')
  loop
    execute format('revoke truncate, references, trigger on %I.%I from anon, authenticated', r.s, r.t);
    if not r.has_anon_policy then
      execute format('revoke insert, update, delete on %I.%I from anon', r.s, r.t);
    end if;
  end loop;
end $$;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema vidlytics revoke all on tables from anon;

commit;
