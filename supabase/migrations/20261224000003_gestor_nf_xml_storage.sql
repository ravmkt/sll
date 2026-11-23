-- Bucket privado dos XMLs de nota fiscal. Caminho: <store_id>/<uuid>.xml
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nf-xml', 'nf-xml', false, 2097152, array['application/xml', 'text/xml'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Extrai a loja do caminho sem estourar erro quando a pasta nao e um uuid
create or replace function public.gestor_nf_xml_store(p_name text)
returns uuid language sql immutable as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;

drop policy if exists nf_xml_insert on storage.objects;
create policy nf_xml_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'nf-xml' and public.gestor_can(public.gestor_nf_xml_store(name), 'notas_fiscais', 'criar'));

drop policy if exists nf_xml_select on storage.objects;
create policy nf_xml_select on storage.objects for select to authenticated
  using (bucket_id = 'nf-xml' and public.gestor_can(public.gestor_nf_xml_store(name), 'notas_fiscais', 'ver'));

drop policy if exists nf_xml_delete on storage.objects;
create policy nf_xml_delete on storage.objects for delete to authenticated
  using (bucket_id = 'nf-xml' and public.gestor_can(public.gestor_nf_xml_store(name), 'notas_fiscais', 'criar'));

select id, public, file_size_limit from storage.buckets where id = 'nf-xml';