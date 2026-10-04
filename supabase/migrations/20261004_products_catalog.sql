create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);
create unique index if not exists uq_product_categories_store_name
  on public.product_categories (store_id, lower(name));

alter table public.product_categories enable row level security;
drop policy if exists "Membro gerencia categorias" on public.product_categories;
create policy "Membro gerencia categorias" on public.product_categories
  for all using (public.is_store_owner_or_member(store_id))
  with check (public.is_store_owner_or_member(store_id));

insert into public.product_categories (store_id, name)
select distinct store_id, btrim(category) from public.products
where category is not null and btrim(category) <> ''
on conflict do nothing;

create index if not exists idx_products_store_sku on public.products (store_id, sku);

do $$
begin
  if not exists (
    select 1 from public.products
    where sku is not null and sku <> ''
    group by store_id, lower(sku) having count(*) > 1
  ) then
    create unique index if not exists uq_products_store_sku
      on public.products (store_id, lower(sku)) where sku is not null and sku <> '';
  else
    raise notice 'SKUs duplicados existentes: indice unico de SKU nao criado.';
  end if;
end $$;