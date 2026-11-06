create or replace function public.plan_is_sellable(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select dp.is_active
      and case
            when dp.is_combo then
              exists (select 1 from public.combo_modules cm where cm.plan_id = dp.id)
              and not exists (
                select 1 from public.combo_modules cm
                left join public.hub_modules hm on hm.slug = cm.module_slug
                where cm.plan_id = dp.id
                  and (hm.slug is null or hm.status <> 'active' or not coalesce(hm.is_public_for_sale, false)))
            else
              exists (
                select 1 from public.hub_modules hm
                where hm.slug = dp.module_slug and hm.status = 'active' and coalesce(hm.is_public_for_sale, false))
          end
    from public.dynamic_plans dp
    where dp.id = p_plan_id
  ), false);
$$;

revoke all on function public.plan_is_sellable(uuid) from public, anon, authenticated;
grant execute on function public.plan_is_sellable(uuid) to service_role;

select dp.plan_name, dp.module_slug, dp.is_combo, public.plan_is_sellable(dp.id) as vendavel
from public.dynamic_plans dp
where dp.is_active
order by dp.is_combo, dp.module_slug, dp.plan_name;