create or replace function public.admin_master_modules(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_res jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  p_days := greatest(1, least(coalesce(p_days, 30), 365));
  v_from := now() - make_interval(days => p_days);

  with subs as (
    select s.store_id, s.status,
           coalesce(s.module_key, dp.module_slug) as mk,
           case
             when s.status <> 'active' then 0
             when dp.id is not null then
               case s.billing_cycle
                 when 'semiannual' then coalesce(dp.price_semiannual_cents, 0) / 6.0
                 when 'annual' then coalesce(dp.price_annual_cents, 0) / 12.0
                 else coalesce(dp.price_monthly_cents, 0)
               end
             else coalesce(pl.price_cents, 0) /
               (case s.billing_cycle when 'semiannual' then 6.0 when 'annual' then 12.0 else 1.0 end)
           end as mrr
    from public.subscriptions s
    left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
    left join public.plans pl on pl.id = s.plan_id
    where s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
  ),
  mods as (
    select m.slug, m.name, m.status, m.is_public_for_sale, m.sort_order, m.updated_at,
           sb.access, sb.paying, sb.trial, sb.past_due, sb.lifetime, sb.mrr,
           (select count(*) from public.system_logs l
             where l.module_slug = m.slug and l.created_at >= v_from
               and l.severity in ('error', 'critical', 'fatal'))::int as errors,
           case when m.slug = 'vidlytics' then ev.events end as events,
           case when m.slug = 'vidlytics' then ev.views end as views,
           case when m.slug = 'vidlytics' then ev.clicks end as clicks,
           case when m.slug = 'vidlytics' then ev.active_stores end as active_stores,
           case when m.slug = 'vidlytics' then vd.videos end as videos,
           case when m.slug = 'vidlytics' then vd.bytes end as storage_bytes
    from public.hub_modules m
    left join lateral (
      select count(distinct store_id)::int as access,
             (count(distinct store_id) filter (where status = 'active'))::int as paying,
             (count(distinct store_id) filter (where status = 'trialing'))::int as trial,
             (count(distinct store_id) filter (where status = 'past_due'))::int as past_due,
             (count(distinct store_id) filter (where status = 'lifetime'))::int as lifetime,
             coalesce(round(sum(mrr) filter (where mk = m.slug)), 0)::bigint as mrr
      from subs where mk = m.slug or mk = 'bundle'
    ) sb on true
    left join lateral (
      select count(*)::bigint as events,
             (count(*) filter (where event_type = 'video_view'))::bigint as views,
             (count(*) filter (where event_type in ('product_click', 'whatsapp_click')))::bigint as clicks,
             count(distinct store_id)::int as active_stores
      from public.store_activity_events e
      where m.slug = 'vidlytics' and e.created_at >= v_from
    ) ev on true
    left join lateral (
      select count(*)::int as videos,
             coalesce(sum(coalesce(file_size, 0) + coalesce(thumbnail_file_size, 0)), 0)::bigint as bytes
      from public.videos where m.slug = 'vidlytics'
    ) vd on true
  )
  select jsonb_build_object(
    'days', p_days,
    'modules', coalesce((select jsonb_agg(to_jsonb(mods) order by mods.sort_order) from mods), '[]'::jsonb),
    'bundle_stores', (select count(distinct store_id) from subs where mk = 'bundle')::int,
    'bundle_mrr', coalesce((select round(sum(mrr)) from subs where mk = 'bundle'), 0)::bigint
  ) into v_res;

  return v_res;
end;
$$;

create or replace function public.admin_module_stores(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.name), '[]'::jsonb) into v
  from (
    select distinct on (st.id)
           st.id, st.name, s.status, s.billing_cycle,
           coalesce(dp.plan_name, pl.name) as plan_name,
           (s.module_key = 'bundle') as via_combo
    from public.subscriptions s
    join public.stores st on st.id = s.store_id
    left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
    left join public.plans pl on pl.id = s.plan_id
    where s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
      and (coalesce(s.module_key, dp.module_slug) = p_slug or s.module_key = 'bundle')
    order by st.id, s.created_at desc
    limit 500
  ) r;

  return v;
end;
$$;

create or replace function public.admin_update_hub_module(
  p_slug text, p_name text, p_status text, p_public boolean, p_sort int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.hub_modules%rowtype;
  v_public boolean;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'O nome do módulo é obrigatório.';
  end if;
  if p_status not in ('active', 'coming_soon') then
    raise exception 'Status inválido.';
  end if;

  select * into v_old from public.hub_modules where slug = p_slug;
  if not found then
    raise exception 'Módulo não encontrado.';
  end if;

  v_public := case when p_status = 'active' then coalesce(p_public, false) else false end;

  update public.hub_modules
     set name = trim(p_name),
         status = p_status,
         is_public_for_sale = v_public,
         sort_order = coalesce(p_sort, sort_order),
         updated_at = now()
   where slug = p_slug;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'module_updated', jsonb_build_object(
    'module_key', p_slug,
    'before', jsonb_build_object('name', v_old.name, 'status', v_old.status, 'public', v_old.is_public_for_sale, 'sort', v_old.sort_order),
    'after', jsonb_build_object('name', trim(p_name), 'status', p_status, 'public', v_public, 'sort', coalesce(p_sort, v_old.sort_order))
  ));
end;
$$;

revoke all on function public.admin_master_modules(int) from public, anon;
revoke all on function public.admin_module_stores(text) from public, anon;
revoke all on function public.admin_update_hub_module(text, text, text, boolean, int) from public, anon;
grant execute on function public.admin_master_modules(int) to authenticated;
grant execute on function public.admin_module_stores(text) to authenticated;
grant execute on function public.admin_update_hub_module(text, text, text, boolean, int) to authenticated;