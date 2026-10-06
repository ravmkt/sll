do $$
declare
  v_list text;
begin
  select string_agg(quote_literal(x), ', ' order by x) into v_list
  from (
    select unnest(array[
      'video_view','story_open','story_complete','video_close','next_video','progress',
      'product_view','product_click','whatsapp_click','share','comment','like','unlike'
    ]) as x
    union
    select event_type from public.store_activity_events
  ) s;

  alter table public.store_activity_events drop constraint if exists check_valid_event_type;

  execute format(
    'alter table public.store_activity_events add constraint check_valid_event_type check (event_type in (%s))',
    v_list
  );
end $$;

-- Conferencia
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.store_activity_events'::regclass and contype = 'c';