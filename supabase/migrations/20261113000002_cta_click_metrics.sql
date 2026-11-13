create or replace function public.get_video_event_metrics(p_store_id uuid, p_start date, p_end date)
returns table(video_id uuid, views bigint, clicks bigint)
language sql
stable
set search_path to 'public'
as $function$
  select e.video_id,
         count(*) filter (where e.event_type = 'video_view'),
         count(*) filter (where e.event_type in ('product_click', 'whatsapp_click', 'cta_click'))
  from public.store_activity_events e
  where e.store_id = p_store_id
    and e.video_id is not null
    and e.event_type in ('video_view', 'product_click', 'whatsapp_click', 'cta_click')
    and e.created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and e.created_at <  ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
  group by e.video_id;
$function$;

create or replace function public.get_video_click_stats(p_store_id uuid, p_video_id uuid, p_start timestamptz, p_end timestamptz)
returns table(kind text, watch_sec integer, qty integer, revenue numeric)
language sql
stable
set search_path to 'public'
as $function$
  select e.event_type::text, e.watch_second::int, count(*)::int, 0::numeric
  from public.store_activity_events e
  where e.store_id::text = p_store_id::text
    and e.video_id::text = p_video_id::text
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_type in ('product_click', 'whatsapp_click', 'cta_click')
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
$function$;

-- Conferencia (deve mostrar clicks = 1 para o video testado)
select * from public.get_video_event_metrics(
  '955ce943-52b4-4876-802c-e4afe5e9c4c8', current_date - 7, current_date);