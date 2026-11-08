create or replace function public.storage_folder_owner(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.builder_user_store(p::uuid)
    else false end
$$;

drop policy if exists "videos_owner_select" on storage.objects;
create policy "videos_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and public.storage_folder_owner((storage.foldername(name))[1]));
drop policy if exists "videos_owner_delete" on storage.objects;
create policy "videos_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and public.storage_folder_owner((storage.foldername(name))[1]));

create or replace function public.store_files_list(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not (public.builder_user_store(p_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;

  with objs as (
    select o.bucket_id, o.name, o.created_at,
           coalesce((o.metadata ->> 'size')::bigint, 0) as bytes,
           split_part(o.name, '/', 2) as seg2,
           array_length(string_to_array(o.name, '/'), 1) as depth
    from storage.objects o
    where (o.bucket_id in ('videos', 'builder-assets', 'builder-pages')
           and split_part(o.name, '/', 1) = p_store::text)
       or (o.bucket_id = 'store-assets'
           and exists (select 1 from public.stores s
                       where s.id = p_store and s.logo_url like '%' || o.name))
  ),
  cls as (
    select objs.*,
      case
        when bucket_id in ('builder-assets', 'builder-pages') then 'Builder'
        when bucket_id = 'store-assets' then 'Loja'
        when seg2 = 'brand' then 'Loja'
        when seg2 = 'thumbnails' or depth = 2 then 'Vidlytics'
        else 'Outros'
      end as module,
      (bucket_id = 'videos' and seg2 = 'thumbnails') as is_thumb,
      regexp_replace(regexp_replace(name, '^.*/', ''), '\.[^.]*$', '') as base
    from objs
  ),
  main as (
    select c.*,
           c.bytes + coalesce((select sum(t.bytes) from cls t
             where t.is_thumb
               and t.name = split_part(c.name, '/', 1) || '/thumbnails/' || c.base || '_thumb.jpg'), 0) as total_bytes
    from cls c
    where not c.is_thumb
  ),
  orphan as (
    select c.*, c.bytes as total_bytes
    from cls c
    where c.is_thumb
      and not exists (select 1 from cls m
                      where not m.is_thumb and m.bucket_id = 'videos' and m.depth = 2
                        and split_part(m.name, '/', 1) = split_part(c.name, '/', 1)
                        and m.base || '_thumb' = c.base)
  ),
  allf as (select * from main union all select * from orphan)
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.name,
           'bucket', a.bucket_id,
           'module', a.module,
           'name', regexp_replace(a.name, '^.*/', ''),
           'title', vv.title,
           'vid_id', vv.vid_id,
           'bytes', a.total_bytes,
           'created_at', a.created_at) order by a.total_bytes desc), '[]'::jsonb)
    into r
  from allf a
  left join lateral (
    select v.id::text as vid_id, to_jsonb(v) ->> 'title' as title
    from vidlytics.vid_videos v
    where a.module = 'Vidlytics'
      and to_jsonb(v) ->> 'store_id' = p_store::text
      and position(a.name in to_jsonb(v)::text) > 0
    limit 1) vv on true;

  return jsonb_build_object('files', r);
end $$;

create or replace function public.store_storage_usage(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l bigint; bm jsonb; tot bigint;
begin
  if not (public.builder_user_store(p_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;
  select coalesce(storage_limit_bytes, 104857600) into l from public.stores where id = p_store;
  select coalesce(jsonb_object_agg(m, s), '{}'::jsonb), coalesce(sum(s), 0)::bigint
    into bm, tot
  from (select e ->> 'module' as m, sum((e ->> 'bytes')::bigint)::bigint as s
        from jsonb_array_elements(public.store_files_list(p_store) -> 'files') e
        group by 1) x;
  return jsonb_build_object(
    'videos_bytes', coalesce((bm ->> 'Vidlytics')::bigint, 0),
    'builder_bytes', coalesce((bm ->> 'Builder')::bigint, 0),
    'used_bytes', tot,
    'limit_bytes', case when l = 0 then null else l end,
    'by_module', bm);
end $$;

revoke all on function public.store_files_list(uuid) from public, anon;
grant execute on function public.store_files_list(uuid) to authenticated;
revoke all on function public.store_storage_usage(uuid) from public, anon;
grant execute on function public.store_storage_usage(uuid) to authenticated;

-- Conferencia: padroes de caminho do bucket videos (para mapear o Stream Sell)
select regexp_replace(name, '[0-9a-f]{8}-[0-9a-f-]{27}|[0-9]{8,}', '#', 'g') as padrao,
       count(*) as arquivos, sum((metadata ->> 'size')::bigint) as bytes
from storage.objects where bucket_id = 'videos'
group by 1 order by 3 desc;