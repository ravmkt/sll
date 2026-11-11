do $$
declare d text;
begin
  d := pg_get_functiondef('public.is_superadmin()'::regprocedure);
  d := replace(d, 'select 1 from public.admin_superusers s',
    'select 1 from (select * from public.admin_superusers where coalesce(is_active, true)) s');
  execute d;

  d := pg_get_functiondef('public.noah_is_master()'::regprocedure);
  d := replace(d, 'from public.admin_superusers where user_id = auth.uid()',
    'from public.admin_superusers where coalesce(is_active, true) and user_id = auth.uid()');
  execute d;

  d := pg_get_functiondef('public.staging_is_master()'::regprocedure);
  d := replace(d, 'from public.admin_superusers where user_id = auth.uid()',
    'from public.admin_superusers where coalesce(is_active, true) and user_id = auth.uid()');
  execute d;
end $$;

notify pgrst, 'reload schema';
