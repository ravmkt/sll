create or replace function public.gestor_stock_history(p_variant uuid, p_limit integer default 50)
returns table (id uuid, type text, qty integer, balance_after integer, channel text, note text, created_at timestamptz)
language plpgsql security definer set search_path = public, erp as $$
declare v_store uuid;
begin
  select v.store_id into v_store from public.product_variants v where v.id = p_variant;
  if v_store is null then raise exception 'Variacao nao encontrada'; end if;
  if not public.is_store_owner_or_member(v_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query
    select m.id, m.type, m.qty, m.balance_after, m.channel, m.note, m.created_at
    from erp.stock_movements m
    where m.variant_id = p_variant
    order by m.created_at desc
    limit least(coalesce(p_limit, 50), 200);
end $$;
revoke all on function public.gestor_stock_history(uuid, integer) from public, anon;
grant execute on function public.gestor_stock_history(uuid, integer) to authenticated;
notify pgrst, 'reload schema';
select 'ok' as resultado;
