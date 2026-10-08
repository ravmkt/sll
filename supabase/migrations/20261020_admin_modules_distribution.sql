create or replace function public.admin_modules_distribution()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object('module', m.module, 'name', coalesce(hm.name, m.module), 'stores', m.stores)
             order by m.stores desc, m.module)
    from (
      select x.module, count(distinct x.store_id)::int as stores
      from (
        select s.store_id,
               unnest(
                 case
                   when coalesce(s.module_key, 'bundle') <> 'bundle' then array[s.module_key]
                   else coalesce(array(select jsonb_array_elements_text(to_jsonb(p.modules))), '{}'::text[])
                 end
               ) as module
        from public.subscriptions s
        left join public.plans p on p.id = s.plan_id
        where s.is_current = true
          and s.status in ('active', 'trialing', 'past_due', 'lifetime')
      ) x
      group by x.module
    ) m
    left join public.hub_modules hm on hm.slug = m.module
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_modules_distribution() from public, anon;
grant execute on function public.admin_modules_distribution() to authenticated;