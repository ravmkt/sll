create or replace view public.admin_stores_enriched as
select
  st.id,
  coalesce(to_jsonb(st)->>'name', to_jsonb(st)->>'store_name', 'Sem nome') as name,
  coalesce(to_jsonb(st)->>'url', to_jsonb(st)->>'store_url', to_jsonb(st)->>'domain') as url,
  coalesce(to_jsonb(st)->>'whatsapp', to_jsonb(st)->>'whatsapp_phone', to_jsonb(st)->>'phone') as phone,
  coalesce(u.email, to_jsonb(st)->>'email') as email,
  coalesce(to_jsonb(st)->>'owner_id', to_jsonb(st)->>'owner_user_id', to_jsonb(st)->>'user_id') as owner_id,
  to_jsonb(st)->>'created_at' as created_at,
  sub.id as sub_id,
  sub.status as sub_status,
  sub.plan_name,
  sub.billing_cycle,
  sub.period_end
from public.stores st
left join auth.users u
  on u.id::text = coalesce(to_jsonb(st)->>'owner_id', to_jsonb(st)->>'owner_user_id', to_jsonb(st)->>'user_id')
left join lateral (
  select s.id, s.status,
         coalesce(dp.plan_name, to_jsonb(lp)->>'name') as plan_name,
         s.billing_cycle,
         to_jsonb(s)->>'current_period_end' as period_end
  from public.subscriptions s
  left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
  left join public.plans lp on lp.id = s.plan_id
  where s.store_id::text = st.id::text and s.is_current = true
  order by (to_jsonb(s)->>'module_key' = 'vidlytics') desc nulls last, s.created_at desc
  limit 1
) sub on true;

revoke all on public.admin_stores_enriched from public, anon, authenticated;

create or replace function public.admin_list_stores(
  p_search text default null, p_status text default null,
  p_limit int default 25, p_offset int default 0
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare r jsonb; v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with f as (
    select * from public.admin_stores_enriched e
    where (v_q is null or e.name ilike '%' || v_q || '%' or e.email ilike '%' || v_q || '%' or e.url ilike '%' || v_q || '%')
      and (nullif(p_status, '') is null
           or (p_status = 'none' and e.sub_status is null)
           or e.sub_status = p_status)
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select * from f order by created_at desc nulls last
        limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)
      ) x), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;

create or replace function public.admin_store_xray(p_store_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_store jsonb;
  v_videos bigint := 0;
  v_bytes numeric := 0;
  v_views numeric := 0;
  v_pages int := 0;
  v_last timestamptz;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select to_jsonb(e) into v_store from public.admin_stores_enriched e where e.id = p_store_id;
  if v_store is null then return null; end if;

  begin
    select count(*),
           coalesce(sum(coalesce((to_jsonb(v)->>'file_size_bytes')::numeric,
                                 (to_jsonb(v)->>'size_bytes')::numeric,
                                 (to_jsonb(v)->>'file_size')::numeric, 0)), 0)
      into v_videos, v_bytes
    from vidlytics.vid_videos v where v.store_id::text = p_store_id::text;
  exception when others then null; end;

  begin
    select coalesce(sum(views_count), 0) into v_views
    from public.daily_video_metrics
    where store_id::text = p_store_id::text and "date" >= date_trunc('month', now())::date;
  exception when others then null; end;

  begin
    select count(distinct lower(coalesce(nullif(regexp_replace(
             regexp_replace(regexp_replace(src, '^https?://[^/]+', ''), '[?#].*$', ''),
             '(.)/+$', '\1'), ''), '/')))
      into v_pages
    from (
      select coalesce(e.metadata->>'page_url', e.metadata->>'page_path', '') as src
      from public.store_activity_events e
      where e.store_id::text = p_store_id::text and e.event_type = 'video_view'
        and e.created_at > now() - interval '90 days'
    ) x where src <> '';
  exception when others then null; end;

  begin
    select max(created_at) into v_last
    from public.store_activity_events where store_id::text = p_store_id::text;
  exception when others then null; end;

  return jsonb_build_object(
    'store', v_store,
    'usage', jsonb_build_object(
      'videos', v_videos, 'storage_bytes', v_bytes, 'views_month', v_views,
      'pages', v_pages, 'last_event_at', v_last),
    'limits', public.get_effective_limits(p_store_id)
  );
end;
$$;

revoke all on function public.admin_list_stores(text, text, int, int) from public, anon;
revoke all on function public.admin_store_xray(uuid) from public, anon;
grant execute on function public.admin_list_stores(text, text, int, int) to authenticated;
grant execute on function public.admin_store_xray(uuid) to authenticated;

select count(*) as lojas from public.admin_stores_enriched;