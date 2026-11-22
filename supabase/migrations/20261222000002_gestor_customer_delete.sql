-- Excluir cliente: pedidos ficam (customer_id vira nulo, ON DELETE SET NULL)
create or replace function public.gestor_customer_delete(p_store uuid, p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_orders integer := 0; v_seller uuid;
begin
  if not public.gestor_can(p_store, 'clientes', 'excluir') then
    raise exception 'Sem permissao para excluir';
  end if;
  select seller_id into v_seller from public.customers where id = p_id and store_id = p_store;
  if not found then raise exception 'Cliente nao encontrado'; end if;
  if public.gestor_scope(p_store) <> 'all' and v_seller is distinct from auth.uid() then
    raise exception 'Sem permissao para este cliente';
  end if;
  select count(*) into v_orders from public.orders where customer_id = p_id;
  delete from public.customers where id = p_id and store_id = p_store;
  return v_orders;
exception when foreign_key_violation then
  raise exception 'Este cliente esta ligado a outros registros e nao pode ser excluido. Desative-o ou remova os vinculos antes.';
end $$;

revoke all on function public.gestor_customer_delete(uuid, uuid) from public, anon;
grant execute on function public.gestor_customer_delete(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

select count(*) as funcao_criada from pg_proc where proname = 'gestor_customer_delete';