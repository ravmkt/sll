create or replace function public.admin_store_flags(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id, 'module_slug', f.module_slug, 'key', f.key, 'name', f.name,
      'description', f.description, 'mode', f.mode,
      'enabled', case f.mode
        when 'all' then true
        when 'stores' then exists (select 1 from public.feature_flag_stores fs where fs.flag_id = f.id and fs.store_id = p_store_id)
        else false end
    ) order by f.module_slug, f.created_at)
    from public.feature_flags f
  ), '[]'::jsonb);
end $$;

revoke all on function public.admin_store_flags(uuid) from public, anon;
grant execute on function public.admin_store_flags(uuid) to authenticated;