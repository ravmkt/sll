drop function if exists public.store_files_list(uuid, boolean);

create or replace function public.store_files_list(p_store uuid, p_usage boolean default true)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_base jsonb;
  v_res jsonb;
  v_names text[];
  v_map jsonb := '{}'::jsonb;
  v_obj jsonb;
  rec record;
  rec2 record;
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
        for rec2 in execute format(
          'select z.fname as fname, coalesce(to_jsonb(xx) ->> ''title'', to_jsonb(xx) ->> ''name'', to_jsonb(xx) ->> ''titulo'', to_jsonb(xx) ->> ''nome'', to_jsonb(xx) ->> ''label'', to_jsonb(xx) ->> ''slug'') as lbl from unnest($1) as z(fname) cross join lateral (select * from %I.%I as q where position(z.fname in q.%I::text) > 0 limit 3) as xx',
          rec.sch, rec.tbl, rec.colname) using v_names
        loop
          v_obj := jsonb_build_object('t', rec.tbl, 'l', rec2.lbl);
          if not (coalesce(v_map -> rec2.fname, '[]'::jsonb) @> jsonb_build_array(v_obj)) then
            v_map := v_map || jsonb_build_object(rec2.fname, coalesce(v_map -> rec2.fname, '[]'::jsonb) || v_obj);
          end if;
        end loop;
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

revoke all on function public.store_files_list(uuid, boolean) from public, anon;
grant execute on function public.store_files_list(uuid, boolean) to authenticated;