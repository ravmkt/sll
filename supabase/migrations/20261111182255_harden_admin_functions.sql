do $$
declare r record; def text;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;

  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_delete_account','admin_update_dynamic_plan')
  loop
    def := pg_get_functiondef(r.oid);
    def := regexp_replace(def, '\mbegin\M',
      E'begin\n  if not (public.is_superadmin() or auth.role() = ''service_role'') then raise exception ''forbidden'' using errcode = ''42501''; end if;',
      'i');
    execute def;
    if r.proname = 'admin_update_dynamic_plan' then
      execute format('alter function %s set search_path = public', r.oid::regprocedure);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
