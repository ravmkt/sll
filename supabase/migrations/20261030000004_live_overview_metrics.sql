create or replace function live_commerce.live_overview_metrics(
  p_store_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = live_commerce, public
as $$
  with ev as (
    select e.live_id,
           e.event_type,
           coalesce(e.product_id::text, nullif(e.metadata->>'product_id', '')) as pid,
           nullif(coalesce(e.metadata->>'visitor_id', e.metadata->>'vid'), '') as vid
    from live_commerce.live_events e
    where e.store_id = p_store_id
      and e.created_at >= p_start
      and e.created_at <= p_end
  )
  select jsonb_build_object(
    'views', (
      select count(distinct (live_id::text || ':' || vid))
      from ev
      where event_type in ('view', 'live_view') and vid is not null
    ),
    'clicks', (
      select count(*) from ev
      where event_type = 'product_click' and pid is not null
    ),
    'signups', (
      select count(*) from ev
      where event_type = 'signup_click'
    ),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('product_id', t.pid, 'n', t.n) order by t.n desc)
      from (
        select pid, count(*) as n
        from ev
        where event_type = 'product_click' and pid is not null
        group by pid
        order by n desc
        limit 5
      ) t
    ), '[]'::jsonb)
  );
$$;

revoke all on function live_commerce.live_overview_metrics(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function live_commerce.live_overview_metrics(uuid, timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';