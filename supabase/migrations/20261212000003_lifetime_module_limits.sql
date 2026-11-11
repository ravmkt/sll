create or replace function public._module_limits(p_store_id uuid, p_module text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  r record; a record; g record; x record;
  v jsonb;
  best jsonb := null;
  k text;
begin
  -- Lojas vitalicias: tudo ilimitado
  if coalesce((select is_lifetime from public.stores where id = p_store_id), false) then
    select coalesce(jsonb_object_agg(e.key,
             case jsonb_typeof(e.value)
               when 'number' then 'null'::jsonb
               when 'boolean' then 'true'::jsonb
               else e.value end), '{}'::jsonb)
      into v
    from (
      select distinct on (je.key) je.key, je.value
      from public.dynamic_plans dp
      cross join lateral jsonb_each(
        case when jsonb_typeof(dp.limits_config) = 'object' then dp.limits_config else '{}'::jsonb end
      ) je
      where dp.module_slug = p_module and not dp.is_combo
    ) e;
    return v || '{"views":null,"max_videos":null,"max_pages":null,"storage_gb":null}'::jsonb;
  end if;

  for r in
    select s.id, s.module_key, s.dynamic_plan_id, s.plan_id
    from public.subscriptions s
    where s.store_id = p_store_id and s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
    order by (s.dynamic_plan_id is not null) desc, s.created_at desc
  loop
    v := null;
    if r.dynamic_plan_id is not null then
      select case
               when dp.is_combo then (
                 select pl.limits_config || coalesce(cm.limits_override, '{}'::jsonb)
                 from public.combo_modules cm
                 cross join lateral (
                   select y.limits_config from public.dynamic_plans y
                   where y.module_slug = cm.module_slug and not y.is_combo
                     and (cm.member_tier is null or y.plan_tier = cm.member_tier)
                   order by y.is_active desc, y.price_monthly_cents desc
                   limit 1
                 ) pl
                 where cm.plan_id = dp.id and cm.module_slug = p_module)
               when dp.module_slug = p_module then dp.limits_config
             end
        into v
      from public.dynamic_plans dp
      where dp.id = r.dynamic_plan_id;
    elsif r.plan_id is not null then
      select jsonb_build_object(
               'views', nullif(p.views_limit, 0),
               'max_videos', nullif(p.videos_limit, 0),
               'max_pages', nullif(p.pages_limit, 0),
               'storage_gb', case when coalesce(p.storage_limit_bytes, 0) = 0 then null
                                  else round(p.storage_limit_bytes / 1073741824.0, 2) end)
        into v
      from public.plans p
      where p.id = r.plan_id
        and (r.module_key = p_module
             or (coalesce(r.module_key, 'bundle') = 'bundle' and to_jsonb(p.modules) ? p_module));
    end if;
    if v is not null and best is null then best := v; end if;
  end loop;

  if best is null then return null; end if;

  for a in
    select ad.grants, sa.quantity
    from public.subscription_addons sa
    join public.plan_addons ad on ad.id = sa.addon_id
    join public.subscriptions s on s.id = sa.subscription_id
    where s.store_id = p_store_id and s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
      and ad.module_slug = p_module
  loop
    for g in select key, value from jsonb_each_text(a.grants) loop
      if best ? g.key and jsonb_typeof(best -> g.key) = 'null' then continue; end if;
      best := best || jsonb_build_object(g.key, coalesce((best ->> g.key)::numeric, 0) + g.value::numeric * a.quantity);
    end loop;
  end loop;

  for x in
    select ad.target_resource, ad.resource_amount * sa.quantity as amt
    from public.store_addons sa
    join public.addons ad on ad.id = sa.addon_id
    where sa.store_id = p_store_id and sa.status = 'active'
      and (ad.scope = 'global' or ad.scope = p_module)
      and ad.target_resource in ('storage_gb', 'plays', 'videos')
  loop
    k := case x.target_resource when 'plays' then 'views' when 'videos' then 'max_videos' else 'storage_gb' end;
    if best ? k and jsonb_typeof(best -> k) = 'null' then continue; end if;
    best := best || jsonb_build_object(k, coalesce((best ->> k)::numeric, 0) + x.amt);
  end loop;

  return best;
end;
$function$;
