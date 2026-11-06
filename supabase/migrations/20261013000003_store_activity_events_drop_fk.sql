do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.store_activity_events'::regclass
      and contype = 'f'
      and conname in ('store_activity_events_video_id_fkey', 'store_activity_events_product_id_fkey')
  loop
    execute format('alter table public.store_activity_events drop constraint %I', r.conname);
  end loop;
end $$;

create index if not exists idx_store_activity_events_store_video
  on public.store_activity_events (store_id, video_id, created_at);

-- Conferencia: nao deve restar FK em video_id/product_id
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.store_activity_events'::regclass and contype = 'f';