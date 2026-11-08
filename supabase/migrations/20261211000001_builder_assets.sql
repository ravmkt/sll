alter table public.stores add column if not exists builder_storage_bytes bigint not null default 0;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('builder-assets', 'builder-assets', true, 209715200,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.builder_user_store(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid())
      or exists (select 1 from public.sll_store_members m where m.store_id = p_store and m.user_id = auth.uid())
$$;

drop policy if exists "builder_assets_insert" on storage.objects;
create policy "builder_assets_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'builder-assets' and public.builder_user_store(((storage.foldername(name))[1])::uuid));

create or replace function public.store_can_upload(p_store uuid, p_bytes bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when not public.builder_user_store(p_store) then false
    when s.storage_limit_bytes = 0 then true
    else coalesce(s.storage_used_bytes,0) + coalesce(s.builder_storage_bytes,0) + p_bytes
         <= coalesce(s.storage_limit_bytes, 104857600)
  end
  from public.stores s
  where s.id = p_store
$$;

create or replace function public.refresh_builder_storage(p_store uuid)
returns bigint language plpgsql security definer set search_path = public, storage as $$
declare v bigint;
begin
  if not public.builder_user_store(p_store) then
    raise exception 'forbidden';
  end if;
  select coalesce(sum((metadata->>'size')::bigint), 0) into v
  from storage.objects
  where bucket_id = 'builder-assets' and (storage.foldername(name))[1] = p_store::text;
  update public.stores set builder_storage_bytes = v where id = p_store;
  return v;
end $$;

grant execute on function public.builder_user_store(uuid) to authenticated;
grant execute on function public.store_can_upload(uuid, bigint) to authenticated;
grant execute on function public.refresh_builder_storage(uuid) to authenticated;