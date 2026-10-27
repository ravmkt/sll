create or replace function live_commerce.live_studio_stats(p_live_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = live_commerce, public
as $$
declare
  v_store uuid;
  v_peak integer;
  v_cur integer;
begin
  select store_id, coalesce(peak_viewers, 0) into v_store, v_peak
  from live_commerce.lives where id = p_live_id;

  if v_store is null then
    return jsonb_build_object('current', 0, 'peak', 0);
  end if;

  if not (live_commerce.is_store_owner(v_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;

  select count(*)::int into v_cur
  from live_commerce.live_viewers
  where live_id = p_live_id and last_seen > now() - interval '30 seconds';

  return jsonb_build_object('current', v_cur, 'peak', greatest(v_peak, v_cur));
end
$$;

revoke all on function live_commerce.live_studio_stats(uuid) from public, anon;
grant execute on function live_commerce.live_studio_stats(uuid) to authenticated;
notify pgrst, 'reload schema';