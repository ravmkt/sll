alter table vidlytics.vid_videos
  add column if not exists paused_by_quota boolean not null default false,
  add column if not exists keep_on_downgrade boolean not null default false;

create or replace function public.enforce_video_cap(p_store_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, vidlytics
as $$
declare lim numeric; n integer := 0;
begin
  if not (public.get_store_active_modules(p_store_id) ? 'vidlytics') then return 0; end if;
  lim := (public._module_limits(p_store_id, 'vidlytics') ->> 'max_videos')::numeric;

  if lim is not null and lim > 0 then
    update vidlytics.vid_videos v
       set active = false, status = 'inactive', paused_by_quota = true
      from (
        select id, row_number() over (order by keep_on_downgrade desc, created_at asc, id) as rn
        from vidlytics.vid_videos
        where store_id::text = p_store_id::text
          and coalesce(video_source_type, '') <> 'image'
          and (active is true or paused_by_quota)
      ) r
     where v.id = r.id and r.rn > lim and v.active is true;
    get diagnostics n = row_count;
  end if;

  update vidlytics.vid_videos v
     set active = true, status = 'active', paused_by_quota = false
    from (
      select id, row_number() over (order by keep_on_downgrade desc, created_at asc, id) as rn
      from vidlytics.vid_videos
      where store_id::text = p_store_id::text
        and coalesce(video_source_type, '') <> 'image'
        and (active is true or paused_by_quota)
    ) r
   where v.id = r.id and v.paused_by_quota
     and (lim is null or lim <= 0 or r.rn <= lim);

  return n;
end;
$$;
revoke all on function public.enforce_video_cap(uuid) from public, anon, authenticated;
grant execute on function public.enforce_video_cap(uuid) to service_role;

create or replace function public.trg_enforce_cap_from_store_addon()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enforce_video_cap(coalesce(new.store_id, old.store_id));
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_store_addons_cap on public.store_addons;
create trigger trg_store_addons_cap
  after insert or update of status or delete on public.store_addons
  for each row execute function public.trg_enforce_cap_from_store_addon();

create or replace function public.list_store_videos_cap(p_store_id uuid)
returns table (id uuid, title text, thumbnail_url text, active boolean, paused_by_quota boolean, keep_on_downgrade boolean)
language plpgsql
security definer
set search_path = public, vidlytics
as $$
begin
  if not (public.is_superadmin() or public.is_store_owner_or_member(p_store_id)) then return; end if;
  return query
    select v.id, v.title, v.thumbnail_url, v.active, v.paused_by_quota, v.keep_on_downgrade
    from vidlytics.vid_videos v
    where v.store_id::text = p_store_id::text and coalesce(v.video_source_type, '') <> 'image'
    order by v.created_at;
end;
$$;

create or replace function public.set_videos_keep(p_store_id uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, vidlytics
as $$
begin
  if not (public.is_superadmin() or public.is_store_owner_or_member(p_store_id)) then
    raise exception 'NAO_AUTORIZADO';
  end if;
  update vidlytics.vid_videos set keep_on_downgrade = (id = any(p_ids))
   where store_id::text = p_store_id::text;
  perform public.enforce_video_cap(p_store_id);
end;
$$;

revoke all on function public.list_store_videos_cap(uuid) from public, anon;
revoke all on function public.set_videos_keep(uuid, uuid[]) from public, anon;
grant execute on function public.list_store_videos_cap(uuid) to authenticated;
grant execute on function public.set_videos_keep(uuid, uuid[]) to authenticated;