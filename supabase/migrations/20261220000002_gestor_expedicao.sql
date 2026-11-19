-- GESTOR: Expedicao (fila por etapa, avanco em lote, envio e entrega)

create index if not exists idx_orders_store_fulfillment
  on public.orders (store_id, fulfillment_status) where canceled_at is null;

create or replace function public.gestor_expedicao_list(
  p_store uuid, p_stage text default 'pending', p_search text default null,
  p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  q   text := nullif(btrim(regexp_replace(coalesce(p_search, ''), '^#', '')), '');
  pat text := '%' || coalesce(nullif(btrim(coalesce(p_search, '')), ''), '') || '%';
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  if p_stage not in ('pending', 'separating', 'shipped', 'delivered') then raise exception 'Etapa invalida'; end if;
  return (
    with base as (
      select o.*, coalesce(o.fulfillment_status, 'pending') as stage
      from public.orders o
      where o.store_id = p_store
        and o.canceled_at is null
        and lower(o.payment_status) in ('paid', 'approved', 'authorized', 'captured', 'completed')
    ),
    f as (
      select b.* from base b
      where b.stage = p_stage
        and (
          q is null
          or b.number::text = q
          or coalesce(b.tracking_code, '') ilike pat
          or exists (select 1 from public.customers c
                     where c.id = b.customer_id and (c.name ilike pat or coalesce(c.email, '') ilike pat))
          or exists (select 1 from public.order_items i
                     where i.order_id = b.id and (coalesce(i.sku, '') ilike pat or coalesce(i.name, '') ilike pat))
        )
    )
    select jsonb_build_object(
      'counts', (select coalesce(jsonb_object_agg(s.stage, s.n), '{}'::jsonb)
                 from (select stage, count(*) as n from base group by stage) s),
      'total', (select count(*) from f),
      'rows', coalesce((
        select jsonb_agg(x.r) from (
          select jsonb_build_object(
            'id', f.id,
            'number', f.number,
            'created_at', f.created_at,
            'paid_at', f.paid_at,
            'channel', f.channel,
            'total', f.total,
            'shipping_service', f.shipping_service,
            'shipping_provider', f.shipping_provider,
            'tracking_code', f.tracking_code,
            'tracking_url', f.tracking_url,
            'shipped_at', f.shipped_at,
            'internal_note', f.internal_note,
            'customer_name', (select c.name from public.customers c where c.id = f.customer_id),
            'address', f.shipping_address,
            'items', coalesce((select jsonb_agg(jsonb_build_object('sku', i.sku, 'name', i.name, 'qty', i.qty))
                               from public.order_items i where i.order_id = f.id), '[]'::jsonb)
          ) as r
          from f
          order by case when p_stage in ('pending', 'separating')
                        then extract(epoch from coalesce(f.paid_at, f.created_at))
                        else -extract(epoch from coalesce(f.shipped_at, f.created_at)) end
          limit p_limit offset p_offset
        ) x
      ), '[]'::jsonb)
    )
  );
end $$;
revoke all on function public.gestor_expedicao_list(uuid, text, text, int, int) from public, anon;
grant execute on function public.gestor_expedicao_list(uuid, text, text, int, int) to authenticated;

-- Avanca varios pedidos: pending <-> separating, shipped -> delivered
create or replace function public.gestor_expedicao_advance(p_orders uuid[], p_status text)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; v_from text;
begin
  if p_status not in ('pending', 'separating', 'delivered') then raise exception 'Status invalido'; end if;
  v_from := case p_status when 'separating' then 'pending' when 'pending' then 'separating' else 'shipped' end;
  for r in select id, store_id from public.orders where id = any(p_orders) loop
    if not public.gestor_can_write(r.store_id) then raise exception 'Sem permissao para editar'; end if;
  end loop;
  update public.orders set
    fulfillment_status = p_status,
    delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
    updated_at = now()
  where id = any(p_orders)
    and canceled_at is null
    and coalesce(fulfillment_status, 'pending') = v_from;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.gestor_expedicao_advance(uuid[], text) from public, anon;
grant execute on function public.gestor_expedicao_advance(uuid[], text) to authenticated;

-- Registra o envio (transportadora, servico e rastreio)
create or replace function public.gestor_expedicao_dispatch(
  p_order uuid, p_provider text, p_service text, p_tracking text, p_tracking_url text)
returns void language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from public.orders where id = p_order;
  if v_store is null then raise exception 'Pedido nao encontrado'; end if;
  if not public.gestor_can_write(v_store) then raise exception 'Sem permissao para editar'; end if;
  update public.orders set
    fulfillment_status = 'shipped',
    shipped_at = coalesce(shipped_at, now()),
    shipping_provider = nullif(btrim(p_provider), ''),
    shipping_service = coalesce(nullif(btrim(p_service), ''), shipping_service),
    tracking_code = nullif(btrim(p_tracking), ''),
    tracking_url = nullif(btrim(p_tracking_url), ''),
    updated_at = now()
  where id = p_order and canceled_at is null
    and coalesce(fulfillment_status, 'pending') in ('pending', 'separating', 'shipped');
  if not found then raise exception 'Pedido cancelado, entregue ou inexistente'; end if;
end $$;
revoke all on function public.gestor_expedicao_dispatch(uuid, text, text, text, text) from public, anon;
grant execute on function public.gestor_expedicao_dispatch(uuid, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

select 'funcoes_expedicao' as item, count(*)::text as valor
from pg_proc where proname like 'gestor_expedicao_%';