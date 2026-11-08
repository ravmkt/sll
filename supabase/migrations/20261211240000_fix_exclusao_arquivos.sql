drop policy if exists "builder_assets_delete" on storage.objects;
create policy "builder_assets_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'builder-assets'
    and public.builder_user_store(((storage.foldername(name))[1])::uuid)
  );

create or replace function public.trg_vid_videos_recalc_storage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.stores s
     set storage_used_bytes = coalesce((
       select sum(coalesce(v.file_size_bytes, 0))
       from vidlytics.vid_videos v
       where v.store_id::text = old.store_id::text), 0)
   where s.id::text = old.store_id::text;
  return old;
end $$;

drop trigger if exists trg_vid_videos_recalc on vidlytics.vid_videos;
create trigger trg_vid_videos_recalc
  after delete on vidlytics.vid_videos
  for each row execute function public.trg_vid_videos_recalc_storage();

-- Conferencia
select policyname, cmd, qual from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'builder_assets%';