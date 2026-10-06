create or replace function public.get_video_click_stats(
  p_store_id uuid,
  p_video_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (kind text, watch_sec int, qty int, revenue numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select e.event_type::text, e.watch_second::int, count(*)::int, 0::numeric
  from public.store_activity_events e
  where e.store_id::text = p_store_id::text
    and e.video_id::text = p_video_id::text
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_type in ('product_click', 'whatsapp_click')
  group by e.event_type, e.watch_second
  union all
  select ('conv_' || coalesce(c.status, 'unknown'))::text, null::int, count(*)::int, coalesce(sum(c.total), 0)::numeric
  from public.sll_conversions c
  where c.store_id::text = p_store_id::text
    and c.source_id::text = p_video_id::text
    and c.module = 'vidlytics'
    and c.created_at >= p_start
    and c.created_at <= p_end
  group by c.status;
$$;

grant execute on function public.get_video_click_stats(uuid, uuid, timestamptz, timestamptz) to authenticated;