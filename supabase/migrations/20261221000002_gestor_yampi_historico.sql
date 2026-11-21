-- Ingestao de pedidos Yampi (webhook e historico):
-- cliente casa por id Yampi, documento ou e-mail (sem erro de e-mail duplicado) e so preenche campos vazios;
-- fulfillment_status acompanha o status da Yampi (evita historico entregue cair em "A separar").
-- Nao mexe em estoque nem em consentimento.

create or replace function erp.ingest_yampi_order(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare
  r        jsonb := p_payload->'resource';
  c        jsonb := coalesce(p_payload->'resource'->'customer'->'data', p_payload->'resource'->'customer');
  a        jsonb := coalesce(p_payload->'resource'->'shipping_address'->'data', p_payload->'resource'->'shipping_address');
  v_items  jsonb := coalesce(p_payload->'resource'->'items'->'data', p_payload->'resource'->'items', '[]'::jsonb);
  v_alias  text  := p_payload->'merchant'->>'alias';
  v_ext    text  := p_payload->'resource'->>'id';
  v_yst    text  := coalesce(p_payload->'resource'->'status'->'data'->>'alias', p_payload->'resource'->'status'->>'alias');
  v_store  uuid;
  v_cust   uuid;
  v_order  uuid;
  v_old    text;
  v_status text;
  v_pay    text;
  v_ful    text;
  v_doc    text;
  v_email  text;
  v_phone  text;
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
  if jsonb_typeof(v_items) <> 'array' then v_items := '[]'::jsonb; end if;

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

  v_ful := case v_status when 'processing' then 'separating' when 'shipped' then 'shipped' when 'delivered' then 'delivered' else null end;

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
  if c is not null and jsonb_typeof(c) = 'object' and (c->>'id' is not null or nullif(c->>'email', '') is not null) then
    v_doc   := coalesce(nullif(c->>'cpf', ''), nullif(c->>'cnpj', ''));
    v_email := lower(nullif(btrim(c->>'email'), ''));
    v_phone := coalesce(nullif(c->'phone'->>'full_number', ''), case when jsonb_typeof(c->'phone') = 'string' then nullif(c->>'phone', '') end);

    if c->>'id' is not null then
      select id into v_cust from public.customers
      where store_id = v_store and source_platform = 'yampi' and external_id = c->>'id' limit 1;
    end if;
    if v_cust is null and v_doc is not null then
      select id into v_cust from public.customers where store_id = v_store and document = v_doc limit 1;
    end if;
    if v_cust is null and v_email is not null then
      select id into v_cust from public.customers where store_id = v_store and lower(email) = v_email limit 1;
    end if;

    if v_cust is null then
      begin
        insert into public.customers (store_id, name, email, phone, document, zip, street, number, complement, district, city, state, tags, source_platform, external_id)
        values (
          v_store,
          coalesce(nullif(c->>'name', ''), 'Cliente Yampi'),
          v_email, v_phone, v_doc,
          nullif(a->>'zipcode', ''), nullif(a->>'street', ''), nullif(a->>'number', ''),
          nullif(a->>'complement', ''), nullif(a->>'neighborhood', ''), nullif(a->>'city', ''), nullif(a->>'uf', ''),
          '{}', 'yampi', c->>'id'
        ) returning id into v_cust;
      exception when unique_violation then
        select id into v_cust from public.customers
        where store_id = v_store and (lower(email) = v_email or (source_platform = 'yampi' and external_id = c->>'id')) limit 1;
      end;
    else
      update public.customers set
        phone      = coalesce(nullif(phone, ''), v_phone),
        document   = coalesce(nullif(document, ''), v_doc),
        zip        = coalesce(nullif(zip, ''), nullif(a->>'zipcode', '')),
        street     = coalesce(nullif(street, ''), nullif(a->>'street', '')),
        number     = coalesce(nullif(number, ''), nullif(a->>'number', '')),
        complement = coalesce(nullif(complement, ''), nullif(a->>'complement', '')),
        district   = coalesce(nullif(district, ''), nullif(a->>'neighborhood', '')),
        city       = coalesce(nullif(city, ''), nullif(a->>'city', '')),
        state      = coalesce(nullif(state, ''), nullif(a->>'uf', ''))
      where id = v_cust;
    end if;
  end if;

  -- pedido
  insert into public.orders (
    store_id, number, customer_id, channel, external_id, status, payment_status, payment_method,
    subtotal, discount, shipping_cost, total, shipping_address, shipping_service, tracking_code,
    fulfillment_status, paid_at, shipped_at, delivered_at, canceled_at, created_at
  ) values (
    v_store,
    coalesce(nullif(regexp_replace(coalesce(r->>'number', ''), '[^0-9]', '', 'g'), '')::bigint, 0),
    v_cust, 'yampi', v_ext, v_status, v_pay,
    nullif(r->'search'->'data'->>'payment_method', ''),
    coalesce((r->>'value_products')::numeric, 0),
    coalesce((r->>'value_discount')::numeric, 0),
    coalesce((r->>'value_shipment')::numeric, 0),
    coalesce((r->>'value_total')::numeric, 0),
    a,
    nullif(r->>'shipment_service', ''),
    nullif(r->>'track_code', ''),
    v_ful, v_paid, v_ship, v_deliv, v_canc,
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
    fulfillment_status = case
      when excluded.fulfillment_status is null then public.orders.fulfillment_status
      when public.orders.fulfillment_status is null then excluded.fulfillment_status
      when array_position(array['pending','separating','shipped','delivered'], excluded.fulfillment_status)
         > array_position(array['pending','separating','shipped','delivered'], public.orders.fulfillment_status)
        then excluded.fulfillment_status
      else public.orders.fulfillment_status end,
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
      coalesce(i->>'item_sku', i->'sku'->'data'->>'sku'),
      coalesce(nullif(i->'sku'->'data'->>'title', ''), nullif(i->'sku'->>'title', ''), i->>'item_sku', 'Item'),
      greatest(coalesce((i->>'quantity')::int, 1), 1),
      coalesce((i->>'price')::numeric, 0),
      0,
      coalesce((i->>'price')::numeric, 0) * greatest(coalesce((i->>'quantity')::int, 1), 1),
      nullif(i->>'price_cost', '')::numeric
    from jsonb_array_elements(v_items) i
    left join public.product_variants pv
      on pv.store_id = v_store and pv.external_id::text = i->>'sku_id';
  end if;

  return v_order;
end $$;

revoke all on function erp.ingest_yampi_order(jsonb) from public, anon, authenticated;
grant execute on function erp.ingest_yampi_order(jsonb) to service_role;

-- Wrapper em public (a Edge Function nao precisa do schema erp exposto). So service_role.
create or replace function public.gestor_ingest_yampi_order(p_payload jsonb)
returns uuid language sql security definer set search_path = public, erp as $$
  select erp.ingest_yampi_order(p_payload);
$$;
revoke all on function public.gestor_ingest_yampi_order(jsonb) from public, anon, authenticated;
grant execute on function public.gestor_ingest_yampi_order(jsonb) to service_role;

notify pgrst, 'reload schema';

select 'pedidos_yampi' as item, count(*)::text as valor from public.orders where channel = 'yampi'
union all select 'clientes', count(*)::text from public.customers;