-- Gestor: campos fiscais, logisticos e descricao completa
alter table public.products
  add column if not exists description text;

alter table public.product_variants
  add column if not exists ean text,
  add column if not exists ncm text,
  add column if not exists cest text,
  add column if not exists cost_price numeric(12,2),
  add column if not exists weight_g integer,
  add column if not exists height_cm numeric(8,2),
  add column if not exists width_cm numeric(8,2),
  add column if not exists length_cm numeric(8,2),
  add column if not exists min_stock integer not null default 0;

create index if not exists idx_product_variants_store_ean
  on public.product_variants (store_id, ean) where ean is not null;

update public.products
   set description = short_description
 where description is null and short_description is not null;

notify pgrst, 'reload schema';
