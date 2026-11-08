drop function if exists public.store_files_list(uuid);
drop function if exists public.store_files_list(uuid, boolean);

create or replace function public.store_files_list(p_store uuid, p_usage boolean default true)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_base jsonb;
  v_res jsonb;
  v_names text[];
  v_map jsonb := '{}'::jsonb;
  rec record;
  v_hit text[];
  v_item text;
begin
  if not (public.builder_user_store(p_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;

  with objs as (
    select o.bucket_id, o.name, o.created_at,
           coalesce((o.metadata ->> 'size')::bigint, 0) as bytes,
           split_part(o.name, '/', 2) as seg2,
           array_length(string_to_array(o.name, '/'), 1) as depth,
           (split_part(o.name, '/', 1) like 'store\_%') as is_ss
    from storage.objects o
    where (o.bucket_id in ('videos', 'builder-assets', 'builder-pages')
           and regexp_replace(split_part(o.name, '/', 1), '^store_', '') = p_store::text)
       or (o.bucket_id = 'store-assets'
           and exists (select 1 from public.stores s
                       where s.id = p_store and s.logo_url like '%' || o.name))
  ),
  cls as (
    select objs.*,
      case
        when bucket_id in ('builder-assets', 'builder-pages') then 'Builder'
        when bucket_id = 'store-assets' then 'Loja'
        when bucket_id = 'videos' and is_ss then 'Stream Sell'
        when seg2 = 'brand' then 'Loja'
        when seg2 = 'thumbnails' or depth = 2 then 'Vidlytics'
        else 'Outros'
      end as module,
      (bucket_id = 'videos' and not is_ss and seg2 = 'thumbnails') as is_thumb,
      regexp_replace(regexp_replace(name, '^.*/', ''), '\.[^.]*$', '') as fbase
    from objs
  ),
  main as (
    select k.*,
           k.bytes + coalesce((select sum(t.bytes) from cls t
             where t.is_thumb
               and t.name = split_part(k.name, '/', 1) || '/thumbnails/' || k.fbase || '_thumb.jpg'), 0) as total_bytes,
           (select t.name from cls t
             where t.is_thumb
               and t.name = split_part(k.name, '/', 1) || '/thumbnails/' || k.fbase || '_thumb.jpg'
             limit 1) as thumb_path
    from cls k
    where not k.is_thumb
  ),
  orphan as (
    select k.*, k.bytes as total_bytes, null::text as thumb_path
    from cls k
    where k.is_thumb
      and not exists (select 1 from cls m
                      where not m.is_thumb and m.bucket_id = 'videos' and m.depth = 2 and not m.is_ss
                        and split_part(m.name, '/', 1) = split_part(k.name, '/', 1)
                        and m.fbase || '_thumb' = k.fbase)
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
           'created_at', a.created_at,
           'thumb_path', a.thumb_path)), '[]'::jsonb)
    into v_base
  from allf a
  left join lateral (
    select v.id::text as vid_id, to_jsonb(v) ->> 'title' as title
    from vidlytics.vid_videos v
    where a.module = 'Vidlytics'
      and not a.is_thumb
      and to_jsonb(v) ->> 'store_id' = p_store::text
      and position(a.name in to_jsonb(v)::text) > 0
    limit 1) vv on true;

  if p_usage then
    select coalesce(array_agg(j.val ->> 'id'), '{}'::text[]) into v_names
    from jsonb_array_elements(v_base) as j(val);

    for rec in
      select col.table_schema::text as sch, col.table_name::text as tbl, col.column_name::text as colname
      from information_schema.columns col
      join information_schema.tables tb
        on tb.table_schema = col.table_schema
       and tb.table_name = col.table_name
       and tb.table_type = 'BASE TABLE'
      where col.table_schema not in ('pg_catalog','information_schema','storage','auth','extensions',
                                     'realtime','vault','graphql','graphql_public','net','pgsodium',
                                     'supabase_functions','supabase_migrations','cron','pgbouncer')
        and col.data_type in ('text','character varying','jsonb','json','ARRAY')
        and col.table_name !~* '(^admin_|version|audit|(^|_)logs?($|_)|event|metric|history|backup)'
    loop
      begin
        execute format(
          'select coalesce(array_agg(z.fname), ''{}''::text[]) from unnest($1) as z(fname) where exists (select 1 from %I.%I as xx where position(z.fname in xx.%I::text) > 0)',
          rec.sch, rec.tbl, rec.colname)
        into v_hit using v_names;

        if v_hit is not null then
          foreach v_item in array v_hit loop
            if not (coalesce(v_map -> v_item, '[]'::jsonb) @> to_jsonb(rec.tbl)) then
              v_map := v_map || jsonb_build_object(v_item, coalesce(v_map -> v_item, '[]'::jsonb) || to_jsonb(rec.tbl));
            end if;
          end loop;
        end if;
      exception when others then
        null;
      end;
    end loop;
  end if;

  select coalesce(jsonb_agg(j.val || jsonb_build_object(
           'in_use', ((j.val ->> 'module') = 'Loja') or (coalesce(v_map -> (j.val ->> 'id'), '[]'::jsonb) <> '[]'::jsonb),
           'used_in', coalesce(v_map -> (j.val ->> 'id'), '[]'::jsonb))
         order by (j.val ->> 'bytes')::bigint desc), '[]'::jsonb)
    into v_res
  from jsonb_array_elements(v_base) as j(val);

  return jsonb_build_object('files', v_res);
end $$;

create or replace function public.store_storage_usage(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_limit bigint; v_bm jsonb; v_tot bigint;
begin
  if not (public.builder_user_store(p_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;
  select coalesce(st.storage_limit_bytes, 104857600) into v_limit from public.stores st where st.id = p_store;
  select coalesce(jsonb_object_agg(g.modname, g.total), '{}'::jsonb), coalesce(sum(g.total), 0)::bigint
    into v_bm, v_tot
  from (select j.val ->> 'module' as modname, sum((j.val ->> 'bytes')::bigint)::bigint as total
        from jsonb_array_elements(public.store_files_list(p_store, false) -> 'files') as j(val)
        group by 1) g;
  return jsonb_build_object(
    'videos_bytes', coalesce((v_bm ->> 'Vidlytics')::bigint, 0),
    'builder_bytes', coalesce((v_bm ->> 'Builder')::bigint, 0),
    'used_bytes', v_tot,
    'limit_bytes', case when v_limit = 0 then null else v_limit end,
    'by_module', v_bm);
end $$;

revoke all on function public.store_files_list(uuid, boolean) from public, anon;
grant execute on function public.store_files_list(uuid, boolean) to authenticated;
revoke all on function public.store_storage_usage(uuid) from public, anon;
grant execute on function public.store_storage_usage(uuid) to authenticated;