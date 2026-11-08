create or replace function public.store_storage_usage(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v bigint; b bigint; l bigint;
begin
  if not (public.builder_user_store(p_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;
  select coalesce(storage_used_bytes, 0), coalesce(builder_storage_bytes, 0), coalesce(storage_limit_bytes, 104857600)
    into v, b, l
  from public.stores where id = p_store;
  return jsonb_build_object(
    'videos_bytes', coalesce(v, 0),
    'builder_bytes', coalesce(b, 0),
    'used_bytes', coalesce(v, 0) + coalesce(b, 0),
    'limit_bytes', case when l = 0 then null else l end
  );
end $$;

revoke all on function public.store_storage_usage(uuid) from public, anon;
grant execute on function public.store_storage_usage(uuid) to authenticated;

-- Conferencia (retorna forbidden fora do SQL Editor com usuario sem acesso; aqui lista a funcao)
select p.oid::regprocedure as funcao from pg_proc p where p.proname = 'store_storage_usage';