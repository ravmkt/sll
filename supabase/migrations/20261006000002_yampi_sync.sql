alter table public.yampi_connections
  add column if not exists webhook_secret text not null default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists webhook_status text,
  add column if not exists dirty_at timestamptz,
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_sync_summary jsonb,
  add column if not exists syncing_until timestamptz;

create unique index if not exists yampi_connections_webhook_secret_key on public.yampi_connections (webhook_secret);

alter table public.products add column if not exists last_synced_at timestamptz;
alter table public.product_variants add column if not exists updated_at timestamptz default now();

create index if not exists idx_product_variants_product on public.product_variants (product_id);
create index if not exists idx_product_variants_store on public.product_variants (store_id);
create index if not exists idx_products_store_source on public.products (store_id, source_platform);

select 'coluna' as tipo, column_name as chave, data_type as valor
from information_schema.columns
where table_schema = 'public' and table_name = 'yampi_connections'
  and column_name in ('webhook_secret','webhook_status','dirty_at','last_sync_at','last_sync_summary','syncing_until')
union all
select 'policy', policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'product_variants';