-- Exclusao de arquivos do Builder pelo dono/membro da loja
drop policy if exists "builder_assets_delete" on storage.objects;
create policy "builder_assets_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'builder-assets'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        then public.builder_user_store(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

-- Soma do Builder na cota e nos totais do admin (troca so a linha de armazenamento)
do $do$
declare
  r record;
  oid_ regprocedure;
  d text;
begin
  for r in select * from (values
    ('public._quota_state(uuid,text,numeric)',
     'select coalesce(sum(file_size_bytes), 0) into v_used from vidlytics.vid_videos',
     'select coalesce(sum(file_size_bytes), 0) + coalesce((select builder_storage_bytes from public.stores where id = p_store_id), 0) into v_used from vidlytics.vid_videos'),
    ('public.admin_master_consumption(date,date,text)',
     'select coalesce(sum(storage_used_bytes), 0)::bigint into v_storage_total from public.stores;',
     'select coalesce(sum(coalesce(storage_used_bytes, 0) + coalesce(builder_storage_bytes, 0)), 0)::bigint into v_storage_total from public.stores;'),
    ('public.admin_saude_metrics(date,date)',
     '''storage_used'', (select coalesce(sum(storage_used_bytes), 0)::bigint from public.stores)',
     '''storage_used'', (select coalesce(sum(coalesce(storage_used_bytes, 0) + coalesce(builder_storage_bytes, 0)), 0)::bigint from public.stores)')
  ) as t(fn, old_txt, new_txt)
  loop
    oid_ := to_regprocedure(r.fn);
    if oid_ is null then
      raise warning 'funcao nao existe: %', r.fn;
      continue;
    end if;
    d := pg_get_functiondef(oid_);
    if position('builder_storage_bytes' in d) > 0 then
      raise notice 'ja atualizada: %', r.fn;
    elsif position(r.old_txt in d) = 0 then
      raise warning 'trecho nao encontrado em %, nada alterado', r.fn;
    else
      execute replace(d, r.old_txt, r.new_txt);
      raise notice 'atualizada: %', r.fn;
    end if;
  end loop;
end
$do$;

-- Conferencia: deve listar as 3 funcoes
select p.oid::regprocedure as funcao
from pg_proc p
where p.proname in ('_quota_state', 'admin_master_consumption', 'admin_saude_metrics')
  and pg_get_functiondef(p.oid) like '%builder_storage_bytes%';