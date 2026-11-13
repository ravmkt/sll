alter table public.store_activity_events add column if not exists visitor_id text;

create index if not exists idx_sae_visitor
  on public.store_activity_events (store_id, video_id, visitor_id, created_at);

-- Views e cliques unicos: 1 por visitante, por video, por dia (America/Sao_Paulo).
-- Eventos antigos sem visitor_id continuam contando 1 a 1.
create or replace function public.get_video_event_metrics(p_store_id uuid, p_start date, p_end date)
 returns table(video_id uuid, views bigint, clicks bigint)
 language sql
 stable
 set search_path to 'public'
as $function$
  select e.video_id,
         count(distinct coalesce(e.visitor_id, e.id::text) || '|' || ((e.created_at at time zone 'America/Sao_Paulo')::date)::text)
           filter (where e.event_type = 'video_view'),
         count(distinct coalesce(e.visitor_id, e.id::text) || '|' || ((e.created_at at time zone 'America/Sao_Paulo')::date)::text)
           filter (where e.event_type in ('product_click', 'whatsapp_click', 'cta_click'))
  from public.store_activity_events e
  where e.store_id = p_store_id
    and e.video_id is not null
    and e.event_type in ('video_view', 'product_click', 'whatsapp_click', 'cta_click')
    and e.created_at >= (p_start::timestamp at time zone 'America/Sao_Paulo')
    and e.created_at <  ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo')
  group by e.video_id;
$function$;

create or replace function public.get_video_click_totals(p_store_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 returns table(video_id uuid, clicks integer)
 language sql
 stable
 set search_path to 'public'
as $function$
  select e.video_id,
         count(distinct coalesce(e.visitor_id, e.id::text) || '|' || ((e.created_at at time zone 'America/Sao_Paulo')::date)::text)::int
  from public.store_activity_events e
  where e.store_id::text = p_store_id::text
    and e.video_id is not null
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_type in ('product_click', 'whatsapp_click', 'cta_click')
  group by e.video_id;
$function$;