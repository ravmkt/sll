create or replace function public.gestor_supplier_delete(p_store uuid, p_id uuid)
returns integer language plpgsql security definer set search_path = public, erp as $$
declare v_links integer := 0;
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para excluir'; end if;
  if not exists (select 1 from erp.suppliers where id = p_id and store_id = p_store) then
    raise exception 'Fornecedor nao encontrado';
  end if;
  select count(*) into v_links from public.product_suppliers where supplier_id = p_id;
  delete from erp.suppliers where id = p_id and store_id = p_store;
  return v_links;
end $$;
revoke all on function public.gestor_supplier_delete(uuid, uuid) from public, anon;
grant execute on function public.gestor_supplier_delete(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';