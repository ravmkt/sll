-- Gestor Fase 1b: categorias, marcas e dados por variação (idempotente)

-- Categorias: descobre qual tabela existe e adiciona hierarquia
do $$
declare cat_table text;
begin
  if to_regclass('public.product_categories') is not null then
    cat_table := 'product_categories';
  elsif to_regclass('public.categories') is not null then
    cat_table := 'categories';
  else
    raise exception 'Nenhuma tabela de categorias encontrada (product_categories/categories)';
  end if;

  execute format('alter table public.%I add column if not exists parent_id uuid references public.%I(id) on delete set null', cat_table, cat_table);
  execute format('alter table public.%I add column if not exists slug text', cat_table);
  execute format('alter table public.%I add column if not exists active boolean not null default true', cat_table);
  execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', cat_table);
  execute format('create index if not exists %I on public.%I (store_id, parent_id)', 'idx_' || cat_table || '_store_parent', cat_table);

  -- Vínculo produto -> categoria
  execute format('alter table public.products add column if not exists category_id uuid references public.%I(id) on delete set null', cat_table);
end $$;

-- Marcas
alter table public.brands add column if not exists active boolean not null default true;
alter table public.products add column if not exists brand_id uuid references public.brands(id) on delete set null;

create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_brand on public.products (brand_id);

-- Dados operacionais, fiscais e logísticos por variação
alter table public.product_variants add column if not exists min_stock integer not null default 0;
alter table public.product_variants add column if not exists cost numeric(12,2);
alter table public.product_variants add column if not exists ean text;
alter table public.product_variants add column if not exists ncm text;
alter table public.product_variants add column if not exists cest text;
alter table public.product_variants add column if not exists weight_g integer;
alter table public.product_variants add column if not exists height_cm numeric(8,2);
alter table public.product_variants add column if not exists width_cm numeric(8,2);
alter table public.product_variants add column if not exists length_cm numeric(8,2);

create index if not exists idx_product_variants_ean on public.product_variants (ean) where ean is not null;
