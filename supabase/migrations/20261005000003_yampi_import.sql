-- Credenciais Yampi: RLS ligado e SEM policies = so a Edge Function (service role) acessa
create table if not exists public.yampi_connections (
  store_id uuid primary key,
  alias text not null,
  user_token text not null,
  user_secret text not null,
  updated_at timestamptz not null default now()
);
alter table public.yampi_connections enable row level security;
revoke all on public.yampi_connections from anon, authenticated;

alter table public.products add column if not exists source_platform text;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  external_id text,
  sku text,
  title text,
  option_name text,
  option_value text,
  price numeric(12,2),
  sale_price numeric(12,2),
  stock integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);
create index if not exists product_variants_store_sku_idx on public.product_variants(store_id, sku);

alter table public.product_variants enable row level security;
drop policy if exists product_variants_access on public.product_variants;
-- herda o acesso da tabela products (RLS do proprio produto)
create policy product_variants_access on public.product_variants
  for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_variants.product_id))
  with check (exists (select 1 from public.products p where p.id = product_variants.product_id));