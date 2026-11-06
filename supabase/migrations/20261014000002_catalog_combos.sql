create or replace function public.get_catalog_combos()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.price_monthly_cents), '[]'::jsonb)
  from (
    select dp.id, dp.plan_name, dp.plan_tier, dp.is_recommended,
           coalesce(dp.sort_order, 0) as sort_order,
           dp.price_monthly_cents, dp.price_semiannual_cents, dp.price_annual_cents,
           (select jsonb_agg(jsonb_build_object(
                     'slug', cm.module_slug, 'name', hm.name, 'logo_url', hm.logo_url,
                     'plan_name', ip.plan_name,
                     'monthly_cents', coalesce(ip.price_monthly_cents, 0),
                     'semiannual_cents', coalesce(ip.price_semiannual_cents, 0),
                     'annual_cents', coalesce(ip.price_annual_cents, 0)) order by hm.sort_order)
              from public.combo_modules cm
              join public.hub_modules hm on hm.slug = cm.module_slug
              left join lateral (
                select y.plan_name, y.price_monthly_cents, y.price_semiannual_cents, y.price_annual_cents
                from public.dynamic_plans y
                where y.module_slug = cm.module_slug and not y.is_combo and y.is_active
                  and (cm.member_tier is null or y.plan_tier = cm.member_tier)
                order by y.price_monthly_cents desc
                limit 1) ip on true
              where cm.plan_id = dp.id) as modules
    from public.dynamic_plans dp
    where dp.is_combo and dp.is_active
      and (select count(*) from public.combo_modules cm where cm.plan_id = dp.id) >= 2
      and not exists (
        select 1 from public.combo_modules cm
        left join public.hub_modules hm on hm.slug = cm.module_slug
        where cm.plan_id = dp.id
          and not coalesce(hm.status = 'active' and hm.is_public_for_sale, false))
  ) c;
$$;
grant execute on function public.get_catalog_combos() to authenticated;
select jsonb_array_length(public.get_catalog_combos()) as combos_visiveis;