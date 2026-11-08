create or replace function public.store_files_list(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare b jsonb := '[]'::jsonb; vd jsonb := '[]'::jsonb;
begin
  if not (public.builder_user_store(p_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', 'builder',
           'id', o.name,
           'name', regexp_replace(o.name, '^.*/', ''),
           'bytes', coalesce((o.metadata ->> 'size')::bigint, 0),
           'created_at', o.created_at)), '[]'::jsonb)
    into b
  from storage.objects o
  where o.bucket_id = 'builder-assets'
    and (storage.foldername(o.name))[1] = p_store::text;

  begin
    select coalesce(jsonb_agg(jsonb_build_object(
             'kind', 'video',
             'id', x.j ->> 'id',
             'name', coalesce(x.j ->> 'title', x.j ->> 'name', x.j ->> 'filename', 'Video'),
             'bytes', coalesce((x.j ->> 'file_size_bytes')::bigint, (x.j ->> 'file_size')::bigint, 0),
             'created_at', x.j ->> 'created_at')), '[]'::jsonb)
      into vd
    from (select to_jsonb(v) as j from vidlytics.vid_videos v) x
    where x.j ->> 'store_id' = p_store::text;
  exception when others then
    vd := '[]'::jsonb;
  end;

  return jsonb_build_object('files', (
    select coalesce(jsonb_agg(e order by (e ->> 'bytes')::bigint desc), '[]'::jsonb)
    from jsonb_array_elements(b || vd) e));
end $$;

revoke all on function public.store_files_list(uuid) from public, anon;
grant execute on function public.store_files_list(uuid) to authenticated;

select p.oid::regprocedure as funcao from pg_proc p where p.proname = 'store_files_list';