-- Tags de cliente por categoria (com status do pedido)
alter table public.product_categories add column if not exists customer_tag text;
alter table public.customers add column if not exists auto_tags text[] not null default '{}';

create unique index if not exists ux_product_categories_customer_tag
  on public.product_categories (store_id, lower(customer_tag)) where customer_tag is not null;

-- Deteccao de teste (palavra inteira)
create or replace function public.gestor_is_test(p text)
returns boolean language sql immutable as $$
  select coalesce(p, '') ~* '\y(teste|testes|test)\y'
$$;

-- Estado do pedido para efeito de tag: paid | canceled | refunded | null
create or replace function public.gestor_order_tag_state(p_payment text, p_status text, p_canceled timestamptz)
returns text language sql stable as $$
  select case
    when lower(coalesce(p_payment, '') || ' ' || coalesce(p_status, '')) ~ '(refund|reembols|estorn|chargeback)' then 'refunded'
    when p_canceled is not null or lower(coalesce(p_payment, '') || ' ' || coalesce(p_status, '')) ~ 'cancel' then 'canceled'
    when order_is_sale(p_payment, p_canceled) then 'paid'
    else null
  end
$$;

-- Recalcula as tags automaticas de UM cliente
create or replace function public.gestor_recalc_customer_tags(p_customer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_store uuid; v_name text; v_email text;
  v_tags text[]; v_old text[]; v_new text[]; v_manual text[]; v_final text[];
begin
  select store_id, name, email, coalesce(tags, '{}'), coalesce(auto_tags, '{}')
    into v_store, v_name, v_email, v_tags, v_old
  from customers where id = p_customer;
  if not found then return; end if;

  if gestor_is_test(v_name) or gestor_is_test(v_email) then
    v_new := '{}';
  else
    with recursive used as (
      select gestor_order_tag_state(o.payment_status, o.status, o.canceled_at) as st, p.category_id
      from orders o
      join order_items i on i.order_id = o.id
      join products p on p.id = coalesce(i.product_id,
        (select p2.id from products p2
          where p2.store_id = o.store_id and p2.sku is not null and lower(p2.sku) = lower(i.sku) limit 1))
      where o.customer_id = p_customer
        and p.category_id is not null
        and not gestor_is_test(o.notes)
        and not gestor_is_test(p.name)
    ),
    up as (
      select u.st, c.id, c.parent_id, c.customer_tag
      from used u join product_categories c on c.id = u.category_id
      union
      select up.st, c.id, c.parent_id, c.customer_tag
      from up join product_categories c on c.id = up.parent_id
    )
    select coalesce(array_agg(distinct q.t), '{}') into v_new
    from (
      select case up.st
               when 'paid' then up.customer_tag
               when 'canceled' then up.customer_tag || ' (cancelado)'
               when 'refunded' then up.customer_tag || ' (reembolsado)'
             end as t
      from up
      where up.customer_tag is not null and up.st is not null
    ) q;
  end if;

  v_manual := array(select t from unnest(v_tags) t where t <> all (v_old));
  v_final := v_manual || array(select t from unnest(coalesce(v_new, '{}')) t where t <> all (v_manual) order by t);

  if v_final is distinct from v_tags or coalesce(v_new, '{}') is distinct from v_old then
    update customers set tags = v_final, auto_tags = coalesce(v_new, '{}') where id = p_customer;
  end if;
end $$;

-- Recalcula todos os clientes de uma loja que tem pedidos ou tags automaticas
create or replace function public.gestor_recalc_store_tags(p_store uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select c.id from customers c
    where c.store_id = p_store
      and (exists (select 1 from orders o where o.customer_id = c.id) or cardinality(c.auto_tags) > 0)
  loop
    perform gestor_recalc_customer_tags(r.id);
  end loop;
end $$;

revoke all on function public.gestor_recalc_customer_tags(uuid) from public, anon, authenticated;
revoke all on function public.gestor_recalc_store_tags(uuid) from public, anon, authenticated;

-- Gatilho: itens do pedido
create or replace function public.gestor_trg_items_tags()
returns trigger language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    select customer_id into v from orders where id = new.order_id;
    if v is not null then perform gestor_recalc_customer_tags(v); end if;
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.order_id is distinct from new.order_id) then
    select customer_id into v from orders where id = old.order_id;
    if v is not null then perform gestor_recalc_customer_tags(v); end if;
  end if;
  return null;
end $$;
drop trigger if exists trg_items_tags on public.order_items;
create trigger trg_items_tags after insert or update or delete on public.order_items
  for each row execute function public.gestor_trg_items_tags();

-- Gatilho: pedido (pagamento, status, cancelamento, cliente)
create or replace function public.gestor_trg_orders_tags()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'DELETE' then
    if new.customer_id is not null then perform gestor_recalc_customer_tags(new.customer_id); end if;
  end if;
  if tg_op <> 'INSERT' then
    if old.customer_id is not null and (tg_op = 'DELETE' or old.customer_id is distinct from new.customer_id) then
      perform gestor_recalc_customer_tags(old.customer_id);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists trg_orders_tags on public.orders;
create trigger trg_orders_tags after insert or update of payment_status, status, canceled_at, customer_id, notes or delete on public.orders
  for each row execute function public.gestor_trg_orders_tags();

-- Gatilho: produto muda de categoria / nome / sku
create or replace function public.gestor_trg_products_tags()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.category_id is not distinct from old.category_id
     and new.name is not distinct from old.name
     and new.sku is not distinct from old.sku then
    return null;
  end if;
  for r in
    select distinct o.customer_id
    from order_items i join orders o on o.id = i.order_id
    where o.customer_id is not null
      and (i.product_id = new.id or (new.sku is not null and lower(i.sku) = lower(new.sku)))
  loop
    perform gestor_recalc_customer_tags(r.customer_id);
  end loop;
  return null;
end $$;
drop trigger if exists trg_products_tags on public.products;
create trigger trg_products_tags after update of category_id, name, sku on public.products
  for each row execute function public.gestor_trg_products_tags();

-- Gatilho: tag/pai da categoria mudou
create or replace function public.gestor_trg_categories_tags()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.customer_tag is null then return null; end if;
  if tg_op = 'UPDATE'
     and new.customer_tag is not distinct from old.customer_tag
     and new.parent_id is not distinct from old.parent_id then
    return null;
  end if;
  perform gestor_recalc_store_tags(coalesce(new.store_id, old.store_id));
  return null;
end $$;
drop trigger if exists trg_categories_tags on public.product_categories;
create trigger trg_categories_tags after insert or update of customer_tag, parent_id or delete on public.product_categories
  for each row execute function public.gestor_trg_categories_tags();

-- RPC da tela: define a tag da categoria (valida duplicidade; respeita RLS)
create or replace function public.gestor_category_set_tag(p_store uuid, p_category uuid, p_tag text)
returns void language plpgsql security invoker set search_path = public as $$
declare v_tag text := nullif(btrim(p_tag), ''); v_other text;
begin
  if v_tag is not null then
    select name into v_other from product_categories
      where store_id = p_store and id <> p_category and lower(customer_tag) = lower(v_tag) limit 1;
    if found then
      raise exception 'A tag "%" já está em uso pela categoria "%".', v_tag, v_other;
    end if;
  end if;
  update product_categories set customer_tag = v_tag where id = p_category and store_id = p_store;
  if not found then raise exception 'Categoria não encontrada ou sem permissão.'; end if;
end $$;
grant execute on function public.gestor_category_set_tag(uuid, uuid, text) to authenticated;

-- Retroativo (so clientes reais; teste fica sem tag automatica)
select gestor_recalc_customer_tags(id) from public.customers;

-- Conferencia 1: valores reais de status/pagamento (para validar reembolso/cancelado)
select payment_status, status, count(*) as pedidos, count(canceled_at) as com_canceled_at
from public.orders group by 1, 2 order by 3 desc;

-- Conferencia 2: tags automaticas geradas
select t as tag, count(*) as clientes
from public.customers c, unnest(c.auto_tags) t
group by 1 order by 2 desc;