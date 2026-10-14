create or replace function public._store_real_modules(p_store_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(distinct x.m), '[]'::jsonb)
  from (
    select s.module_key as m
    from public.subscriptions s
    where s.store_id::text = p_store_id::text and s.is_current
      and s.status in ('active','trialing','past_due','lifetime')
      and s.module_key is not null and s.module_key <> 'bundle'
    union
    select cm.module_slug
    from public.subscriptions s
    join public.combo_modules cm on cm.plan_id = s.dynamic_plan_id
    where s.store_id::text = p_store_id::text and s.is_current
      and s.status in ('active','trialing','past_due','lifetime')
    union
    select e
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    cross join lateral jsonb_array_elements_text(to_jsonb(p.modules)) e
    where s.store_id::text = p_store_id::text and s.is_current
      and s.status in ('active','trialing','past_due','lifetime')
      and coalesce(s.module_key, 'bundle') = 'bundle'
  ) x
  where exists (select 1 from public.hub_modules h where h.slug = x.m);
$$;
revoke all on function public._store_real_modules(uuid) from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public._admin_master_stores_overview_base()') is null then
    alter function public.admin_master_stores_overview() rename to _admin_master_stores_overview_base;
  end if;
end $$;
revoke all on function public._admin_master_stores_overview_base() from public, anon, authenticated;

create or replace function public.admin_master_stores_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(o.v || jsonb_build_object('modules', public._store_real_modules((o.v ->> 'id')::uuid)) order by o.n)
    from jsonb_array_elements(public._admin_master_stores_overview_base()) with ordinality as o(v, n)
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_master_stores_overview() from public, anon;
grant execute on function public.admin_master_stores_overview() to authenticated;
