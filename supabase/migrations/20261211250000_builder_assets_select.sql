drop policy if exists "builder_assets_select" on storage.objects;
create policy "builder_assets_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'builder-assets'
    and public.builder_user_store(((storage.foldername(name))[1])::uuid)
  );

-- Conferencia
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'builder_assets%'
order by 1;

-- Diagnostico: a funcao precisa ser security definer
select proname, prosecdef from pg_proc where proname = 'builder_user_store';