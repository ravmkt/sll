-- Ingestao de pedidos Yampi (webhook order.*) para public.orders / order_items / customers
-- Nao altera estoque: o sync da Yampi segue espelhando o saldo ate o gestor_master ser ligado.

create or replace function erp.yampi_status_ts(r jsonb, p_alias text)
returns timestamptz language sql immutable as $$
  select (s->'created_at'->>'date')::timestamp at time zone 'America/Sao_Paulo'
  from jsonb_array_elements(coalesce(r->'statuses'->'data', '[]'::jsonb)) s
  where s->>'alias' = p_alias
  order by s->'created_at'->>'date'
  limit 1
$$;

create or replace function erp.ingest_yampi_order(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare
  r        jsonb := p_payload->'resource';
  c        jsonb := p_payload->'resource'->'customer'->'data';
  a        jsonb := p_payload->'resource'->'shipping_address'->'data';
  v_alias  text  := p_payload->'merchant'->>'alias';
  v_ext    text  := p_payload->'resource'->>'id';
  v_yst    text  := p_payload->'resource'->'status'->'data'->>'alias';
  v_store  uuid;
  v_cust   uuid;
  v_order  uuid;
  v_old    text;
  v_status text;
  v_pay    text;
  v_doc    text;
  v_paid   timestamptz;
  v_ship   timestamptz;
  v_deliv  timestamptz;
  v_canc   timestamptz;
  v_rank_new int;
  v_rank_old int;
begin
  if coalesce(p_payload->>'event', '') not like 'order.%' or r is null or v_ext is null then
    return null;
  end if;

  select store_id into v_store from public.yampi_connections where alias = v_alias limit 1;
  if v_store is null then return null; end if;

  perform pg_advisory_xact_lock(hashtext(v_store::text || ':yampi:' || v_ext));

  select id, status into v_order, v_old
  from public.orders where store_id = v_store and channel = 'yampi' and external_id = v_ext;

  v_status := case v_yst
    when 'waiting_payment'   then 'pending'
    when 'paid'              then 'paid'
    when 'handling_products' then 'processing'
    when 'shipped'           then 'shipped'
    when 'delivered'         then 'delivered'
    when 'cancelled'         then 'canceled'
    else null end;

  if v_status is null then
    v_status := coalesce(v_old, 'pending');
  elsif v_old is not null then
    if v_old in ('canceled', 'returned') then
      v_status := v_old;
    elsif v_status not in ('canceled', 'returned') then
      v_rank_new := case v_status when 'pending' then 0 when 'paid' then 1 when 'processing' then 2 when 'shipped' then 3 else 4 end;
      v_rank_old := case v_old    when 'pending' then 0 when 'paid' then 1 when 'processing' then 2 when 'shipped' then 3 else 4 end;
      if v_rank_new < v_rank_old then v_status := v_old; end if;
    end if;
  end if;

  v_paid  := erp.yampi_status_ts(r, 'paid');
  v_ship  := erp.yampi_status_ts(r, 'shipped');
  v_deliv := erp.yampi_status_ts(r, 'delivered');
  v_canc  := erp.yampi_status_ts(r, 'cancelled');

  v_pay := case
    when v_status in ('paid', 'processing', 'shipped', 'delivered') then 'paid'
    when v_status = 'canceled' then case when v_paid is not null then 'refunded' else 'failed' end
    when v_status = 'returned' then 'refunded'
    else 'pending' end;

  -- cliente
  if c is not null and c->>'id' is not null then
    v_doc := coalesce(nullif(c->>'cpf', ''), nullif(c->>'cnpj', ''));
    select id into v_cust from public.customers
    where store_id = v_store and source_platform = 'yampi' and external_id = c->>'id' limit 1;
    if v_cust is null and v_doc is not null then
      select id into v_cust from public.customers where store_id = v_store and document = v_doc limit 1;
    end if;
    if v_cust is null then
      insert into public.customers (store_id, name, email, phone, document, zip, street, number, complement, district, city, state, tags, source_platform, external_id)
      values (
        v_store,
        coalesce(nullif(c->>'name', ''), 'Cliente Yampi'),
        nullif(c->>'email', ''),
        nullif(c->'phone'->>'full_number', ''),
        v_doc,
        nullif(a->>'zipcode', ''),
        nullif(a->>'street', ''),
        nullif(a->>'number', ''),
        nullif(a->>'complement', ''),
        nullif(a->>'neighborhood', ''),
        nullif(a->>'city', ''),
        nullif(a->>'uf', ''),
        '{}',
        'yampi',
        c->>'id'
      ) returning id into v_cust;
    end if;
  end if;

  -- pedido
  insert into public.orders (
    store_id, number, customer_id, channel, external_id, status, payment_status, payment_method,
    subtotal, discount, shipping_cost, total, shipping_address, shipping_service, tracking_code,
    paid_at, shipped_at, delivered_at, canceled_at, created_at
  ) values (
    v_store,
    coalesce((r->>'number')::bigint, 0),
    v_cust, 'yampi', v_ext, v_status, v_pay,
    nullif(r->'search'->'data'->>'payment_method', ''),
    coalesce((r->>'value_products')::numeric, 0),
    coalesce((r->>'value_discount')::numeric, 0),
    coalesce((r->>'value_shipment')::numeric, 0),
    coalesce((r->>'value_total')::numeric, 0),
    a,
    nullif(r->>'shipment_service', ''),
    nullif(r->>'track_code', ''),
    v_paid, v_ship, v_deliv, v_canc,
    coalesce((r->'created_at'->>'date')::timestamp at time zone 'America/Sao_Paulo', now())
  )
  on conflict (store_id, channel, external_id) where external_id is not null
  do update set
    customer_id    = coalesce(excluded.customer_id, public.orders.customer_id),
    status         = excluded.status,
    payment_status = excluded.payment_status,
    payment_method = coalesce(excluded.payment_method, public.orders.payment_method),
    subtotal       = excluded.subtotal,
    discount       = excluded.discount,
    shipping_cost  = excluded.shipping_cost,
    total          = excluded.total,
    shipping_address = coalesce(excluded.shipping_address, public.orders.shipping_address),
    shipping_service = coalesce(excluded.shipping_service, public.orders.shipping_service),
    tracking_code  = coalesce(excluded.tracking_code, public.orders.tracking_code),
    paid_at        = coalesce(public.orders.paid_at, excluded.paid_at),
    shipped_at     = coalesce(public.orders.shipped_at, excluded.shipped_at),
    delivered_at   = coalesce(public.orders.delivered_at, excluded.delivered_at),
    canceled_at    = coalesce(public.orders.canceled_at, excluded.canceled_at),
    updated_at     = now()
  returning id into v_order;

  -- itens (gravados uma vez)
  if not exists (select 1 from public.order_items where order_id = v_order) then
    insert into public.order_items (store_id, order_id, product_id, variant_id, sku, name, qty, unit_price, discount, total, cost_price)
    select
      v_store, v_order, pv.product_id, pv.id,
      i->>'item_sku',
      coalesce(nullif(i->'sku'->'data'->>'title', ''), i->>'item_sku', 'Item'),
      greatest(coalesce((i->>'quantity')::int, 1), 1),
      coalesce((i->>'price')::numeric, 0),
      0,
      coalesce((i->>'price')::numeric, 0) * greatest(coalesce((i->>'quantity')::int, 1), 1),
      nullif(i->>'price_cost', '')::numeric
    from jsonb_array_elements(coalesce(r->'items'->'data', '[]'::jsonb)) i
    left join public.product_variants pv
      on pv.store_id = v_store and pv.external_id::text = i->>'sku_id';
  end if;

  return v_order;
end $$;

revoke all on function erp.ingest_yampi_order(jsonb) from public, anon, authenticated;
grant execute on function erp.ingest_yampi_order(jsonb) to service_role;

create or replace function erp.trg_webhook_ingest_order()
returns trigger language plpgsql security definer set search_path = public, erp as $$
begin
  begin
    perform erp.ingest_yampi_order(new.payload);
  exception when others then
    raise warning 'ingest_yampi_order falhou: %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists trg_webhook_ingest_order on erp.webhook_events;
create trigger trg_webhook_ingest_order
after insert on erp.webhook_events
for each row execute function erp.trg_webhook_ingest_order();

notify pgrst, 'reload schema';

-- Triggers existentes nas tabelas envolvidas (me envie este resultado)
select tgrelid::regclass::text as tabela, tgname as trigger_nome
from pg_trigger
where not tgisinternal
  and tgrelid in ('public.orders'::regclass, 'public.order_items'::regclass, 'erp.webhook_events'::regclass)
order by 1, 2;