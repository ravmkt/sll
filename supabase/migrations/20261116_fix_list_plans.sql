create or replace function public.admin_master_list_plans()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.plan_name,
      'module_key', p.module_slug,
      'is_combo', coalesce(p.is_combo, false),
      'is_active', coalesce(p.is_active, true)
    ) order by p.is_combo, p.module_slug, p.sort_order)
    from public.dynamic_plans p
  ), '[]'::jsonb);
end $$;
grant execute on function public.admin_master_list_plans() to authenticated;