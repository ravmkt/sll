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
  digits boolean := (nullif(trim(coalesce(p_search, '')), '') ~ '^[0-9]+$');
  pat text := '%' || coalesce(nullif(trim(coalesce(p_search, '')), ''), '') || '%';
begin
  return (
    with f as (
      select o.* from public.orders o
      where o.store_id = p_store
        and (
          q is null
          or (digits and (
                o.number::text = q
                or exists (select 1 from public.order_items i where i.order_id = o.id and i.sku = q)
                or (length(q) >= 8 and exists (
                      select 1 from public.customers c, jsonb_each_text(to_jsonb(c)) k
                      where c.id::text = to_jsonb(o)->>'customer_id'
                        and k.key in ('cpf', 'cnpj', 'document', 'tax_id', 'phone', 'whatsapp', 'mobile')
                        and regexp_replace(k.value, '[^0-9]', '', 'g') like '%' || q || '%'))
             ))
          or (not coalesce(digits, false) and (
                exists (select 1 from jsonb_each_text(to_jsonb(o)) k
                        where k.key not in ('shipping_address', 'billing_address', 'address')
                          and k.value ilike pat)
                or exists (select 1 from public.customers c, jsonb_each_text(to_jsonb(c)) k
                           where c.id::text = to_jsonb(o)->>'customer_id'
                             and k.key in ('name', 'full_name', 'first_name', 'last_name', 'email')
                             and k.value ilike pat)
                or exists (select 1 from public.order_items i
                           where i.order_id = o.id
                             and (i.sku ilike pat
                                  or exists (select 1 from jsonb_each_text(to_jsonb(i)) k
                                             where k.key in ('name', 'title', 'product_name')
                                               and k.value ilike pat)))
             ))
        )
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

grant execute on function public.gestor_orders_list(uuid, text, text, text, text, int, int) to authenticated;