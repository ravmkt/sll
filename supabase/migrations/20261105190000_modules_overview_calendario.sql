begin;

create or replace function public.admin_master_modules(p_days integer default 30)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz;
  v_res jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  p_days := greatest(1, least(coalesce(p_days, 30), 365));
  -- dias de calendario no fuso de Sao Paulo (1 = Hoje, desde 00:00)
  v_from := (((now() at time zone 'America/Sao_Paulo')::date - (p_days - 1))::timestamp) at time zone 'America/Sao_Paulo';

  with subs as (
    select s.store_id, s.status,
           coalesce(s.module_key, dp.module_slug) as mk,
           case
             when s.status <> 'active' then 0
             when dp.id is not null then
               case s.billing_cycle
                 when 'semiannual' then coalesce(dp.price_semiannual_cents, 0) / 6.0
                 when 'annual' then coalesce(dp.price_annual_cents, 0) / 12.0
                 when 'yearly' then coalesce(dp.price_annual_cents, 0) / 12.0
                 else coalesce(dp.price_monthly_cents, 0)
               end
             else coalesce(pl.price_cents, 0) /
               (case s.billing_cycle when 'semiannual' then 6.0 when 'annual' then 12.0 when 'yearly' then 12.0 else 1.0 end)
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
$function$;

notify pgrst, 'reload schema';
commit;