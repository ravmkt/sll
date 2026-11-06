insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketing', 'marketing', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marketing leitura publica" on storage.objects;
create policy "marketing leitura publica" on storage.objects
  for select using (bucket_id = 'marketing');

drop policy if exists "master envia marketing" on storage.objects;
create policy "master envia marketing" on storage.objects
  for insert to authenticated with check (bucket_id = 'marketing' and public.is_superadmin());

drop policy if exists "master altera marketing" on storage.objects;
create policy "master altera marketing" on storage.objects
  for update to authenticated using (bucket_id = 'marketing' and public.is_superadmin())
  with check (bucket_id = 'marketing' and public.is_superadmin());

drop policy if exists "master apaga marketing" on storage.objects;
create policy "master apaga marketing" on storage.objects
  for delete to authenticated using (bucket_id = 'marketing' and public.is_superadmin());

select id, public, file_size_limit from storage.buckets where id = 'marketing';