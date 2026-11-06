create or replace function public.admin_master_consumption(p_start date, p_end date, p_module text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_measured boolean := (p_module is null or p_module = 'vidlytics');
  v_events jsonb := '{}'::jsonb;
  v_from timestamptz;
  v_to timestamptz;
  v_videos_total int := 0;
  v_videos_new int := 0;
  v_videos_bytes bigint := 0;
  v_storage_total bigint := 0;
  v_top jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if p_start is null or p_end is null or p_start > p_end then
    raise exception 'invalid_range';
  end if;

  v_from := p_start::timestamp at time zone 'America/Sao_Paulo';
  v_to := (p_end + 1)::timestamp at time zone 'America/Sao_Paulo';

  if v_measured then
    select coalesce(jsonb_object_agg(t.event_type, t.n), '{}'::jsonb) into v_events
    from (
      select event_type, count(*)::bigint as n
      from public.store_activity_events
      where created_at >= v_from and created_at < v_to
      group by event_type
    ) t;

    select count(*)::int,
           count(*) filter (where created_at >= v_from and created_at < v_to)::int,
           coalesce(sum(coalesce(file_size, 0) + coalesce(thumbnail_file_size, 0)), 0)::bigint
      into v_videos_total, v_videos_new, v_videos_bytes
    from public.videos;
  end if;

  select coalesce(sum(storage_used_bytes), 0)::bigint into v_storage_total from public.stores;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'name', x.name, 'used', x.storage_used_bytes, 'limit', x.storage_limit_bytes)), '[]'::jsonb)
    into v_top
  from (
    select id, name, storage_used_bytes, storage_limit_bytes
    from public.stores
    where coalesce(storage_used_bytes, 0) > 0
    order by storage_used_bytes desc
    limit 5
  ) x;

  return jsonb_build_object(
    'measured', v_measured,
    'events', v_events,
    'videos_total', v_videos_total,
    'videos_new', v_videos_new,
    'videos_bytes', v_videos_bytes,
    'storage_total', v_storage_total,
    'top_storage', v_top
  );
end;
$$;

revoke all on function public.admin_master_consumption(date, date, text) from public, anon;
grant execute on function public.admin_master_consumption(date, date, text) to authenticated;