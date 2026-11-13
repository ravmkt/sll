-- 1) Libera cta_click na tabela de eventos (mantem todos os tipos ja existentes)
do $$
declare v_list text;
begin
  select string_agg(quote_literal(x.t), ',') into v_list
  from (
    select unnest(array['video_view','story_open','story_complete','video_close','next_video','progress',
                        'product_view','product_click','whatsapp_click','cta_click','share','comment','like','unlike']) as t
    union
    select distinct event_type from public.store_activity_events where event_type is not null
  ) x;
  alter table public.store_activity_events drop constraint if exists check_valid_event_type;
  execute format('alter table public.store_activity_events add constraint check_valid_event_type check (event_type in (%s))', v_list);
end $$;

-- 2) Cliques reais por video (produto + WhatsApp + card informativo)
create or replace function public.get_video_click_totals(p_store_id uuid, p_start timestamptz, p_end timestamptz)
returns table (video_id uuid, clicks int)
language sql
stable
security invoker
set search_path = public
as $$
  select e.video_id, count(*)::int
  from public.store_activity_events e
  where e.store_id::text = p_store_id::text
    and e.video_id is not null
    and e.created_at >= p_start
    and e.created_at <= p_end
    and e.event_type in ('product_click', 'whatsapp_click', 'cta_click')
  group by e.video_id;
$$;

grant execute on function public.get_video_click_totals(uuid, timestamptz, timestamptz) to authenticated;