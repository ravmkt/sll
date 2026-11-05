begin;

drop function if exists public.admin_streamsell_metrics(integer);
drop function if exists public.admin_streamsell_metrics(integer, date, date);
drop function if exists public.admin_vidlytics_metrics(integer);
drop function if exists public.admin_vidlytics_metrics(integer, date, date);

create or replace function public.admin_streamsell_metrics(
  p_days integer default 30, p_start date default null, p_end date default null, p_store_id uuid default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz := case when p_start is not null
    then (p_start::timestamp at time zone 'America/Sao_Paulo')
    else now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) end;
  v_to timestamptz := case when p_end is not null
    then ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    else 'infinity'::timestamptz end;
  r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  with ev as (
    select e.live_id, e.event_type, e.created_at,
           nullif(e.metadata->>'visitor_id', '') as vid
    from live_commerce.live_events e
    where e.created_at >= v_from and e.created_at < v_to
      and (p_store_id is null or e.store_id = p_store_id)
  ),
  lv as (
    select l.id, l.store_id, l.title, l.status, l.started_at, l.peak_viewers
    from live_commerce.lives l
    where coalesce(l.started_at, l.scheduled_at, l.created_at) >= v_from
      and coalesce(l.started_at, l.scheduled_at, l.created_at) < v_to
      and (p_store_id is null or l.store_id = p_store_id)
  ),
  cv as (
    select c.total
    from public.sll_conversions c
    where c.status = 'paid' and c.created_at >= v_from and c.created_at < v_to
      and (c.module ilike '%stream%' or c.module ilike '%live%')
      and (p_store_id is null or c.store_id = p_store_id)
  )
  select jsonb_build_object(
    'subscribers', (select count(distinct s.store_id) from public.subscriptions s
                    where s.module_key = 'live_commerce' and s.is_current and s.status in ('active', 'trialing')
                      and (p_store_id is null or s.store_id = p_store_id)),
    'subs_without_live', (select count(distinct s.store_id) from public.subscriptions s
                          where s.module_key = 'live_commerce' and s.is_current and s.status in ('active', 'trialing')
                            and (p_store_id is null or s.store_id = p_store_id)
                            and not exists (select 1 from live_commerce.lives l where l.store_id = s.store_id)),
    'stores_with_live', (select count(distinct store_id) from lv),
    'lives_total', (select count(*) from lv),
    'lives_held', (select count(*) from lv where started_at is not null),
    'by_status', coalesce((select jsonb_object_agg(x.st, x.n)
                           from (select coalesce(status, '-') as st, count(*) as n from lv group by 1) x), '{}'::jsonb),
    'peak', (select coalesce(max(peak_viewers), 0) from lv),
    'views_total', (select count(*) from ev where event_type = 'view'),
    'views_unique', (select count(distinct (live_id::text || ':' || vid)) from ev where event_type = 'view' and vid is not null),
    'product_clicks', (select count(*) from ev where event_type = 'product_click'),
    'promo_clicks', (select count(*) from ev where event_type = 'promo_click'),
    'group_clicks', (select count(*) from ev where event_type = 'group_click'),
    'signup_clicks', (select count(*) from ev where event_type = 'signup_click'),
    'share_clicks', (select count(*) from ev where event_type = 'share_click'),
    'chat_messages', (select count(*) from live_commerce.live_chat_messages m
                      where m.created_at >= v_from and m.created_at < v_to
                        and coalesce(m.is_from_store, false) = false
                        and (p_store_id is null or m.store_id = p_store_id)),
    'leads', (select count(*) from live_commerce.live_leads ll
              where ll.created_at >= v_from and ll.created_at < v_to
                and (p_store_id is null or ll.store_id = p_store_id)),
    'orders', (select count(*) from cv),
    'revenue', (select coalesce(sum(total), 0) from cv),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', d.v, 'clicks', d.c) order by d.day)
      from (
        select (created_at at time zone 'America/Sao_Paulo')::date as day,
               count(*) filter (where event_type = 'view') as v,
               count(*) filter (where event_type = 'product_click') as c
        from ev group by 1
      ) d), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.views desc)
      from (
        select l.id, l.title, s.name as store, l.status, coalesce(l.peak_viewers, 0) as peak,
               count(*) filter (where e.event_type = 'view') as views,
               count(*) filter (where e.event_type = 'product_click') as clicks
        from lv l
        left join public.stores s on s.id = l.store_id
        left join ev e on e.live_id = l.id
        group by l.id, l.title, s.name, l.status, l.peak_viewers
        order by views desc
        limit 10
      ) t), '[]'::jsonb)
  ) into r;

  return r;
end;
$function$;

create or replace function public.admin_vidlytics_metrics(
  p_days integer default 30, p_start date default null, p_end date default null, p_store_id uuid default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz := case when p_start is not null
    then (p_start::timestamp at time zone 'America/Sao_Paulo')
    else now() - make_interval(days => greatest(coalesce(p_days, 30), 1)) end;
  v_to timestamptz := case when p_end is not null
    then ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
    else 'infinity'::timestamptz end;
  r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  with myvid as (
    select vv.id from vidlytics.vid_videos vv where p_store_id is not null and vv.store_id = p_store_id
  ),
  ev as (
    select a.event_type, a.video_id, a.created_at
    from public.store_activity_events a
    where a.created_at >= v_from and a.created_at < v_to
      and (p_store_id is null or a.video_id in (select id from myvid))
  ),
  subs as (
    select distinct s.store_id
    from public.subscriptions s
    where s.module_key = 'vidlytics' and s.is_current and s.status in ('active', 'trialing')
      and (p_store_id is null or s.store_id = p_store_id)
  ),
  cv as (
    select c.total
    from public.sll_conversions c
    where c.status = 'paid' and c.created_at >= v_from and c.created_at < v_to
      and c.module ilike '%vidlytics%'
      and (p_store_id is null or c.store_id = p_store_id)
  )
  select jsonb_build_object(
    'subscribers', (select count(*) from subs),
    'subs_without_video', (select count(*) from subs
                           where not exists (select 1 from vidlytics.vid_videos v
                                             where v.store_id = subs.store_id and coalesce(v.active, true))),
    'stores_with_video', (select count(distinct store_id) from vidlytics.vid_videos
                          where (p_store_id is null or store_id = p_store_id)),
    'videos_total', (select count(*) from vidlytics.vid_videos where (p_store_id is null or store_id = p_store_id)),
    'videos_active', (select count(*) from vidlytics.vid_videos v
                      where coalesce(v.active, true) and (p_store_id is null or v.store_id = p_store_id)),
    'storage_bytes', (select coalesce(sum(file_size_bytes), 0) from vidlytics.vid_videos
                      where (p_store_id is null or store_id = p_store_id)),
    'stories', (select count(*) from vidlytics.vid_stories st
                where (p_store_id is null or to_jsonb(st)->>'store_id' = p_store_id::text)),
    'views', (select count(*) from ev where event_type in ('video_view', 'view')),
    'plays', (select count(*) from ev where event_type in ('play', 'video_play', 'video_start')),
    'clicks', (select count(*) from ev where event_type in ('product_click', 'whatsapp_click', 'cta_click')),
    'likes', (select count(*) from public.video_likes t
              where t.created_at >= v_from and t.created_at < v_to
                and (p_store_id is null or to_jsonb(t)->>'video_id' in (select id::text from myvid)))
           + (select count(*) from vidlytics.vid_video_likes t
              where t.created_at >= v_from and t.created_at < v_to
                and (p_store_id is null or to_jsonb(t)->>'video_id' in (select id::text from myvid))),
    'comments', (select count(*) from vidlytics.vid_comments t
                 where t.created_at >= v_from and t.created_at < v_to
                   and (p_store_id is null or to_jsonb(t)->>'video_id' in (select id::text from myvid))),
    'orders', (select count(*) from cv),
    'revenue', (select coalesce(sum(total), 0) from cv),
    'events_by_type', coalesce((select jsonb_object_agg(x.et, x.n)
                                from (select event_type as et, count(*) as n from ev group by 1) x), '{}'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', d.v, 'clicks', d.c) order by d.day)
      from (
        select (created_at at time zone 'America/Sao_Paulo')::date as day,
               count(*) filter (where event_type in ('video_view', 'view')) as v,
               count(*) filter (where event_type in ('product_click', 'whatsapp_click', 'cta_click')) as c
        from ev group by 1
      ) d), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.views desc)
      from (
        select v.id, v.title, s.name as store,
               count(*) filter (where e.event_type in ('video_view', 'view')) as views,
               count(*) filter (where e.event_type in ('product_click', 'whatsapp_click', 'cta_click')) as clicks
        from ev e
        join vidlytics.vid_videos v on v.id = e.video_id
        left join public.stores s on s.id = v.store_id
        group by v.id, v.title, s.name
        order by views desc
        limit 10
      ) t), '[]'::jsonb)
  ) into r;

  return r;
end;
$function$;

revoke all on function public.admin_streamsell_metrics(integer, date, date, uuid) from public, anon;
revoke all on function public.admin_vidlytics_metrics(integer, date, date, uuid) from public, anon;
grant execute on function public.admin_streamsell_metrics(integer, date, date, uuid) to authenticated, service_role;
grant execute on function public.admin_vidlytics_metrics(integer, date, date, uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;