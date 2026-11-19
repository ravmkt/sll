alter table public.orders
  add column if not exists fulfillment_status text,
  add column if not exists tracking_code text,
  add column if not exists tracking_url text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists restocked_at timestamptz,
  add column if not exists internal_note text;

create or replace function public.gestor_orders_facets(p_store uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'payment', coalesce((select jsonb_agg(distinct payment_status) from public.orders
                         where store_id = p_store and payment_status is not null), '[]'::jsonb),
    'channel', coalesce((select jsonb_agg(distinct channel) from public.orders
                         where store_id = p_store and channel is not null), '[]'::jsonb)
  );
$$;

create or replace function public.gestor_orders_list(
  p_store uuid,
  p_search text default null,
  p_payment text default null,
  p_fulfillment text default null,
  p_channel text default null,
  p_limit int default 25,
  p_offset int default 0
) returns jsonb language plpgsql stable as $$
declare
  q text := nullif(trim(coalesce(p_search, '')), '');
begin
  return (
    with f as (
      select o.* from public.orders o
      where o.store_id = p_store
        and (q is null or o::text ilike '%' || q || '%')
        and (p_payment is null or o.payment_status::text = p_payment)
        and (p_channel is null or o.channel::text = p_channel)
        and (
          p_fulfillment is null
          or (p_fulfillment = 'canceled' and o.canceled_at is not null)
          or (p_fulfillment <> 'canceled' and o.canceled_at is null
              and coalesce(o.fulfillment_status, 'pending') = p_fulfillment)
        )
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'rows', coalesce((
        select jsonb_agg(x.r) from (
          select to_jsonb(f) || jsonb_build_object('customer', (
                   select to_jsonb(c) from public.customers c
                   where c.id::text = to_jsonb(f)->>'customer_id' limit 1)) as r
          from f
          order by to_jsonb(f)->>'created_at' desc nulls last
          limit p_limit offset p_offset
        ) x
      ), '[]'::jsonb)
    )
  );
end $$;

create or replace function public.gestor_order_detail(p_order uuid)
returns jsonb language plpgsql stable as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order;
  if not found then raise exception 'Pedido não encontrado'; end if;
  return jsonb_build_object(
    'order', to_jsonb(o),
    'customer', (select to_jsonb(c) from public.customers c
                 where c.id::text = to_jsonb(o)->>'customer_id' limit 1),
    'items', coalesce((select jsonb_agg(to_jsonb(i)) from public.order_items i
                       where i.order_id = o.id), '[]'::jsonb)
  );
end $$;

create or replace function public.gestor_order_set_fulfillment(
  p_order uuid, p_status text,
  p_tracking text default null, p_tracking_url text default null, p_note text default null
) returns void language plpgsql as $$
begin
  if p_status not in ('pending', 'separating', 'shipped', 'delivered') then
    raise exception 'Status inválido';
  end if;
  update public.orders set
    fulfillment_status = p_status,
    tracking_code = coalesce(nullif(trim(p_tracking), ''), tracking_code),
    tracking_url = coalesce(nullif(trim(p_tracking_url), ''), tracking_url),
    internal_note = coalesce(p_note, internal_note),
    shipped_at = case when p_status in ('shipped', 'delivered') then coalesce(shipped_at, now()) else null end,
    delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else null end
  where id = p_order and canceled_at is null;
  if not found then raise exception 'Pedido não encontrado ou já cancelado'; end if;
end $$;

create or replace function public.gestor_order_cancel(
  p_order uuid, p_restock boolean default true, p_reason text default null
) returns jsonb language plpgsql as $$
declare
  o public.orders;
  it record;
  vid uuid;
  bal int;
  res jsonb := '[]'::jsonb;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if o.canceled_at is not null then raise exception 'O pedido já está cancelado'; end if;

  if p_restock and o.restocked_at is null then
    for it in
      select sku, sum(qty)::int as qty from public.order_items
      where order_id = o.id and sku is not null group by sku
    loop
      select id into vid from public.product_variants
      where store_id = o.store_id and sku = it.sku limit 1;
      if vid is not null and it.qty > 0 then
        update public.product_variants set sync_hold_until = now() + interval '60 seconds' where id = vid;
        bal := public.gestor_stock_move(vid, 'return', it.qty,
                 'Cancelamento do pedido ' || coalesce(to_jsonb(o)->>'number', o.id::text));
        res := res || jsonb_build_array(jsonb_build_object('variant_id', vid, 'sku', it.sku, 'balance', bal));
      end if;
    end loop;
  end if;

  update public.orders set
    canceled_at = now(),
    restocked_at = case when p_restock then coalesce(restocked_at, now()) else restocked_at end,
    internal_note = nullif(trim(coalesce(internal_note || E'\n', '') || coalesce('Cancelado: ' || p_reason, '')), '')
  where id = o.id;
  return res;
end $$;

grant execute on function public.gestor_orders_facets(uuid) to authenticated;
grant execute on function public.gestor_orders_list(uuid, text, text, text, text, int, int) to authenticated;
grant execute on function public.gestor_order_detail(uuid) to authenticated;
grant execute on function public.gestor_order_set_fulfillment(uuid, text, text, text, text) to authenticated;
grant execute on function public.gestor_order_cancel(uuid, boolean, text) to authenticated;