delete from public.sll_conversions a
using public.sll_conversions b
where a.store_id = b.store_id
  and a.order_id = b.order_id
  and a.order_id is not null
  and (a.created_at, a.id) > (b.created_at, b.id);

create unique index if not exists uq_sll_conversions_store_order
  on public.sll_conversions (store_id, order_id)
  where order_id is not null;

create or replace function public.record_sll_conversion(
  p_store_id uuid,
  p_token text,
  p_order_id text,
  p_total numeric,
  p_module text,
  p_source_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valid boolean;
begin
  select exists(
    select 1 from public.stores
    where id = p_store_id
      and security_token = p_token
      and security_token is not null
  ) into v_valid;

  if not v_valid then
    raise exception 'invalid store token';
  end if;

  insert into public.sll_conversions (store_id, order_id, total, module, source_id)
  values (p_store_id, p_order_id, p_total, p_module, p_source_id)
  on conflict (store_id, order_id) where order_id is not null do nothing;
end;
$$;

grant execute on function public.record_sll_conversion to anon, authenticated;

-- TESTE (rode separado): grava uma venda ficticia e ela deve aparecer em Vendas Pagas
-- insert into public.sll_conversions (store_id, order_id, total, module, source_id)
-- values ('c1911fc6-ec70-4be1-9ec1-0443fbfb7632', 'TESTE-001', 199.90, 'vidlytics', null);
-- Depois de conferir, apague:
-- delete from public.sll_conversions where order_id = 'TESTE-001';