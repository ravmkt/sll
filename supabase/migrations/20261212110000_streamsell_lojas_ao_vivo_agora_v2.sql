begin;

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
    'stores_live_now', (select count(distinct l.store_id) from live_commerce.lives l
                        where l.status = 'live'
                          and l.ended_at is null
                          and coalesce(l.started_at, l.created_at) > now() - interval '12 hours'
                          and (p_store_id is null or l.store_id = p_store_id)),
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

notify pgrst, 'reload schema';
commit;