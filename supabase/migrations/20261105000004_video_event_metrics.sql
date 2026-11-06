create or replace function public.get_video_event_metrics(p_store_id uuid, p_start date, p_end date)
returns table(video_id uuid, views bigint, clicks bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select e.video_id,
         count(*) filter (where e.event_type = 'video_view'),
         count(*) filter (where e.event_type in ('product_click', 'whatsapp_click'))
  from public.store_activity_events e
  where e.store_id = p_store_id
    and e.video_id is not null
    and e.event_type in ('video_view', 'product_click', 'whatsapp_click')
    and e.created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and e.created_at <  ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
  group by e.video_id;
$$;

revoke all on function public.get_video_event_metrics(uuid, date, date) from public, anon;
grant execute on function public.get_video_event_metrics(uuid, date, date) to authenticated;

-- Conferencia (Use Anny, ultimos 30 dias)
select * from public.get_video_event_metrics('a7759b72-b48b-405b-aa02-5bb32b27df7a', current_date - 29, current_date);