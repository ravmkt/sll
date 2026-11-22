-- Tags de cliente pela categoria dos produtos comprados

create or replace function public.apply_customer_tags(p_store uuid, p_customer uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with want as (
    select o.customer_id, array_agg(distinct t.tag) as tags
      from public.orders o
      join public.order_items i on i.order_id = o.id
      join public.products p on p.id = i.product_id
      join public.product_categories c on c.id = p.category_id
      cross join lateral unnest(
        case when coalesce(array_length(c.customer_tags, 1), 0) > 0 then c.customer_tags
             when nullif(btrim(c.customer_tag), '') is not null then array[btrim(c.customer_tag)]
             else '{}'::text[] end
      ) as t(tag)
     where o.store_id = p_store
       and o.customer_id is not null
       and (p_customer is null or o.customer_id = p_customer)
       and public.order_is_sale(o.payment_status::text, o.canceled_at)
       and nullif(btrim(t.tag), '') is not null
     group by o.customer_id
  )
  update public.customers cu
     set tags = (select coalesce(array_agg(x order by x), '{}') from unnest(coalesce(cu.tags, '{}') || w.tags) as u(x)),
         updated_at = now()
    from want w
   where cu.id = w.customer_id
     and cu.store_id = p_store
     and not (w.tags <@ coalesce(cu.tags, '{}'));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.apply_customer_tags(uuid, uuid) from public, anon, authenticated;

create or replace function public.gestor_customer_tags_apply(p_store uuid)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  return public.apply_customer_tags(p_store, null);
end $$;
revoke all on function public.gestor_customer_tags_apply(uuid) from public, anon;
grant execute on function public.gestor_customer_tags_apply(uuid) to authenticated;

create or replace function public.gestor_customer_tags(p_store uuid)
returns table(tag text, customers integer)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query
    select t.x, count(*)::integer
      from public.customers c, unnest(c.tags) as t(x)
     where c.store_id = p_store and nullif(btrim(t.x), '') is not null
     group by t.x
     order by t.x;
end $$;
revoke all on function public.gestor_customer_tags(uuid) from public, anon;
grant execute on function public.gestor_customer_tags(uuid) to authenticated;

-- Triggers: pedido pago e item novo aplicam as tags (nunca bloqueiam o pedido)
create or replace function public.trg_orders_apply_tags()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.customer_id is not null and public.order_is_sale(new.payment_status::text, new.canceled_at) then
    perform public.apply_customer_tags(new.store_id, new.customer_id);
  end if;
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists trg_orders_apply_tags on public.orders;
create trigger trg_orders_apply_tags
  after insert or update of payment_status, canceled_at, customer_id on public.orders
  for each row execute function public.trg_orders_apply_tags();

create or replace function public.trg_order_items_apply_tags()
returns trigger language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select store_id, customer_id, payment_status, canceled_at into o from public.orders where id = new.order_id;
  if o.customer_id is not null and public.order_is_sale(o.payment_status::text, o.canceled_at) then
    perform public.apply_customer_tags(o.store_id, o.customer_id);
  end if;
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists trg_order_items_apply_tags on public.order_items;
create trigger trg_order_items_apply_tags
  after insert on public.order_items
  for each row execute function public.trg_order_items_apply_tags();

-- Carga inicial
select public.apply_customer_tags(s.id, null) from public.stores s;

notify pgrst, 'reload schema';

select
  (select count(*) from public.customers where coalesce(array_length(tags, 1), 0) > 0) as clientes_com_tag,
  (select count(*) from public.customers) as clientes_total,
  (select count(*) from public.product_categories
    where coalesce(array_length(customer_tags, 1), 0) > 0 or customer_tag is not null) as categorias_com_tag;