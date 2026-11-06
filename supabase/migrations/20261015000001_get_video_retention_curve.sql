create or replace function public.get_video_retention_curve(
  p_store_id uuid,
  p_video_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (max_second int, completed boolean, sessions int)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (
    select
      e.session_id,
      bool_or(e.event_type = 'story_complete') as completed,
      coalesce(max(e.watch_second) filter (where e.event_type in ('progress','video_close')), 0) as max_sec
    from public.store_activity_events e
    where e.store_id::text = p_store_id::text
      and e.video_id::text = p_video_id::text
      and e.created_at >= p_start
      and e.created_at <= p_end
      and e.session_id is not null
      and e.event_type in ('video_view','progress','video_close','story_complete')
    group by e.session_id
  )
  select s.max_sec::int, s.completed, count(*)::int
  from s
  group by s.max_sec, s.completed
  order by s.max_sec;
$$;

grant execute on function public.get_video_retention_curve(uuid, uuid, timestamptz, timestamptz) to authenticated;