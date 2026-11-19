-- Gestor: Clientes (consentimento CRM + views de estatisticas, produtos e geografia)

alter table public.customers add column if not exists accepts_marketing boolean not null default false;
alter table public.customers add column if not exists accepts_marketing_at timestamptz;
alter table public.customers add column if not exists accepts_whatsapp boolean not null default false;
alter table public.customers add column if not exists accepts_whatsapp_at timestamptz;
alter table public.customers add column if not exists last_contact_at timestamptz;

create index if not exists idx_orders_store_customer on public.orders (store_id, customer_id);
create index if not exists idx_order_items_order on public.order_items (order_id);

-- Regra unica do que conta como venda (ajuste aqui se mudar)
create or replace function public.order_is_sale(p_payment text, p_canceled timestamptz)
returns boolean language sql immutable as $$
  select p_canceled is null
     and lower(coalesce(p_payment, '')) in ('paid', 'approved', 'authorized', 'captured', 'completed');
$$;

create or replace function public.norm_city(p text)
returns text language sql immutable as $$
  select nullif(translate(lower(btrim(coalesce(p, ''))),
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '');
$$;

-- Indicadores por cliente (base do CRM e do RFV)
create or replace view public.customer_stats with (security_invoker = true) as
select
  c.id as customer_id, c.store_id, c.name, c.email, c.phone, c.document,
  c.city, c.state, c.tags, c.source_platform, c.accepts_marketing, c.accepts_whatsapp, c.created_at,
  count(o.id) as orders_all,
  count(o.id) filter (where s.ok) as orders_count,
  coalesce(sum(o.total) filter (where s.ok), 0)::numeric(14,2) as total_spent,
  coalesce(round(avg(o.total) filter (where s.ok), 2), 0)::numeric(14,2) as avg_ticket,
  min(o.created_at) filter (where s.ok) as first_order_at,
  max(o.created_at) filter (where s.ok) as last_order_at,
  (current_date - (max(o.created_at) filter (where s.ok))::date) as days_since_last,
  (array_agg(o.channel order by o.created_at) filter (where o.id is not null))[1] as first_channel
from public.customers c
left join public.orders o on o.customer_id = c.id
left join lateral (select public.order_is_sale(o.payment_status::text, o.canceled_at) as ok) s on true
group by c.id;

-- O que cada cliente compra
create or replace view public.customer_products with (security_invoker = true) as
select
  o.store_id, o.customer_id, i.product_id, i.sku, i.name,
  sum(i.qty)::numeric as qty,
  sum(i.total)::numeric(14,2) as total,
  count(distinct o.id) as orders_count,
  max(o.created_at) as last_purchase_at
from public.order_items i
join public.orders o on o.id = i.order_id
where o.customer_id is not null
  and public.order_is_sale(o.payment_status::text, o.canceled_at)
group by o.store_id, o.customer_id, i.product_id, i.sku, i.name;

-- Vendas por local e periodo (cidade/UF do endereco de entrega do pedido)
create or replace view public.sales_geo with (security_invoker = true) as
select
  o.id as order_id, o.store_id, o.customer_id, o.created_at,
  date_trunc('month', o.created_at)::date as month,
  o.channel, o.total,
  public.order_is_sale(o.payment_status::text, o.canceled_at) as is_sale,
  coalesce(
    nullif(upper(btrim(o.shipping_address->>'uf')), ''),
    case when length(btrim(coalesce(o.shipping_address->>'state', ''))) = 2
         then upper(btrim(o.shipping_address->>'state')) end
  ) as uf,
  nullif(btrim(o.shipping_address->>'city'), '') as city,
  public.norm_city(o.shipping_address->>'city') as city_norm
from public.orders o;

grant select on public.customer_stats, public.customer_products, public.sales_geo to authenticated;
