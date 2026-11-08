alter table public.product_variants
  add column if not exists sync_hold_until timestamptz;
