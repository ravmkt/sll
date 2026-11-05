-- Metricas do Master: Stream Sell e Vidlytics (somente leitura, so superadmin)
begin;

create or replace function public.admin_streamsell_metrics(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  with ev as (
    select e.live_id, e.event_type, e.created_at,
           nullif(e.metadata->>'visitor_id', '') as vid
    from live_commerce.live_events e
    where e.created_at >= v_from
  ),
  lv as (
    select l.id, l.store_id, l.title, l.status, l.started_at, l.peak_viewers
    from live_commerce.lives l
    where coalesce(l.started_at, l.scheduled_at, l.created_at) >= v_from
  ),
  cv as (
    select c.total
    from public.sll_conversions c
    where c.status = 'paid' and c.created_at >= v_from
      and (c.module ilike '%stream%' or c.module ilike '%live%')
  )
  select jsonb_build_object(
    'subscribers', (select count(distinct s.store_id) from public.subscriptions s
                    where s.module_key = 'live_commerce' and s.is_current and s.status in ('active', 'trialing')),
    'subs_without_live', (select count(distinct s.store_id) from public.subscriptions s
                          where s.module_key = 'live_commerce' and s.is_current and s.status in ('active', 'trialing')
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
                      where m.created_at >= v_from and coalesce(m.is_from_store, false) = false),
    'leads', (select count(*) from live_commerce.live_leads where created_at >= v_from),
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
$$;

create or replace function public.admin_vidlytics_metrics(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  with ev as (
    select a.event_type, a.video_id, a.created_at
    from public.store_activity_events a
    where a.created_at >= v_from
  ),
  subs as (
    select distinct s.store_id
    from public.subscriptions s
    where s.module_key = 'vidlytics' and s.is_current and s.status in ('active', 'trialing')
  ),
  cv as (
    select c.total
    from public.sll_conversions c
    where c.status = 'paid' and c.created_at >= v_from and c.module ilike '%vidlytics%'
  )
  select jsonb_build_object(
    'subscribers', (select count(*) from subs),
    'subs_without_video', (select count(*) from subs
                           where not exists (select 1 from vidlytics.vid_videos v
                                             where v.store_id = subs.store_id and coalesce(v.active, true))),
    'stores_with_video', (select count(distinct store_id) from vidlytics.vid_videos),
    'videos_total', (select count(*) from vidlytics.vid_videos),
    'videos_active', (select count(*) from vidlytics.vid_videos v where coalesce(v.active, true)),
    'storage_bytes', (select coalesce(sum(file_size_bytes), 0) from vidlytics.vid_videos),
    'stories', (select count(*) from vidlytics.vid_stories),
    'views', (select count(*) from ev where event_type in ('video_view', 'view')),
    'plays', (select count(*) from ev where event_type in ('play', 'video_play', 'video_start')),
    'clicks', (select count(*) from ev where event_type in ('product_click', 'whatsapp_click', 'cta_click')),
    'likes', (select count(*) from public.video_likes where created_at >= v_from)
           + (select count(*) from vidlytics.vid_video_likes where created_at >= v_from),
    'comments', (select count(*) from vidlytics.vid_comments where created_at >= v_from),
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
$$;

revoke all on function public.admin_streamsell_metrics(int) from public, anon;
revoke all on function public.admin_vidlytics_metrics(int) from public, anon;
grant execute on function public.admin_streamsell_metrics(int) to authenticated;
grant execute on function public.admin_vidlytics_metrics(int) to authenticated;
notify pgrst, 'reload schema';

commit;

select proname from pg_proc where proname in ('admin_streamsell_metrics', 'admin_vidlytics_metrics') order by 1;