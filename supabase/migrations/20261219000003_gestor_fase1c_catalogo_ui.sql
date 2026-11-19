-- GESTOR Fase 1c: categorias, marcas e detalhes por variacao (idempotente)

alter table public.product_categories add column if not exists parent_id uuid references public.product_categories(id) on delete set null;
alter table public.product_categories add column if not exists slug text;
alter table public.product_categories add column if not exists active boolean not null default true;
alter table public.product_categories add column if not exists updated_at timestamptz not null default now();
alter table public.brands add column if not exists active boolean not null default true;

-- Valida EAN/GTIN (8, 12, 13 ou 14 digitos, com digito verificador)
create or replace function erp.gtin_valid(p text)
returns boolean language plpgsql immutable as $$
declare n int; i int; s int := 0; w int;
begin
  if p is null or p !~ '^[0-9]+$' or length(p) not in (8, 12, 13, 14) then return false; end if;
  n := length(p);
  for i in 1..n - 1 loop
    w := case when ((n - i) % 2) = 1 then 3 else 1 end;
    s := s + substr(p, i, 1)::int * w;
  end loop;
  return ((10 - s % 10) % 10) = substr(p, n, 1)::int;
end $$;

-- Detalhes operacionais, fiscais e logisticos da variacao
create or replace function public.gestor_variant_save_details(
  p_variant uuid, p_min_stock integer, p_cost numeric, p_ean text, p_ncm text, p_cest text,
  p_weight_g integer, p_height numeric, p_width numeric, p_length numeric)
returns void language plpgsql security definer set search_path = public, erp as $$
declare
  v_store uuid;
  v_ean  text := nullif(regexp_replace(coalesce(p_ean, ''),  '[^0-9]', '', 'g'), '');
  v_ncm  text := nullif(regexp_replace(coalesce(p_ncm, ''),  '[^0-9]', '', 'g'), '');
  v_cest text := nullif(regexp_replace(coalesce(p_cest, ''), '[^0-9]', '', 'g'), '');
begin
  select store_id into v_store from public.product_variants where id = p_variant;
  if v_store is null then raise exception 'Variacao nao encontrada'; end if;
  if not public.gestor_can_write(v_store) then raise exception 'Sem permissao para editar'; end if;
  if coalesce(p_min_stock, 0) < 0 then raise exception 'Estoque minimo nao pode ser negativo'; end if;
  if coalesce(p_cost, 0) < 0 then raise exception 'Custo nao pode ser negativo'; end if;
  if coalesce(p_weight_g, 0) < 0 or coalesce(p_height, 0) < 0 or coalesce(p_width, 0) < 0 or coalesce(p_length, 0) < 0 then
    raise exception 'Peso e dimensoes nao podem ser negativos';
  end if;
  if v_ean is not null and not erp.gtin_valid(v_ean) then raise exception 'EAN/GTIN invalido'; end if;
  if v_ean is not null and exists (
    select 1 from public.product_variants x where x.store_id = v_store and x.ean = v_ean and x.id <> p_variant
  ) then raise exception 'Este EAN ja esta em outra variacao'; end if;
  if v_ncm is not null and length(v_ncm) <> 8 then raise exception 'NCM deve ter 8 digitos'; end if;
  if v_cest is not null and length(v_cest) <> 7 then raise exception 'CEST deve ter 7 digitos'; end if;

  update public.product_variants set
    min_stock = coalesce(p_min_stock, 0),
    cost_price = p_cost,
    ean = v_ean, ncm = v_ncm, cest = v_cest,
    weight_g = p_weight_g, height_cm = p_height, width_cm = p_width, length_cm = p_length,
    updated_at = now()
  where id = p_variant;
end $$;
revoke all on function public.gestor_variant_save_details(uuid, integer, numeric, text, text, text, integer, numeric, numeric, numeric) from public, anon;
grant execute on function public.gestor_variant_save_details(uuid, integer, numeric, text, text, text, integer, numeric, numeric, numeric) to authenticated;

-- Categorias
create or replace function public.gestor_categories(p_store uuid)
returns table(id uuid, name text, parent_id uuid, active boolean, products bigint)
language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query
    select c.id, c.name, c.parent_id, coalesce(c.active, true),
           (select count(*) from public.products p where p.category_id = c.id)
    from public.product_categories c
    where c.store_id = p_store
    order by c.name;
end $$;
revoke all on function public.gestor_categories(uuid) from public, anon;
grant execute on function public.gestor_categories(uuid) to authenticated;

create or replace function public.gestor_category_save(
  p_store uuid, p_name text, p_id uuid default null, p_parent uuid default null, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text;
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  if v_name = '' then raise exception 'Informe o nome da categoria'; end if;
  v_slug := trim(both '-' from regexp_replace(
    translate(lower(v_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '[^a-z0-9]+', '-', 'g'));

  if p_parent is not null then
    if not exists (select 1 from public.product_categories where id = p_parent and store_id = p_store) then
      raise exception 'Categoria pai invalida';
    end if;
    if p_id is not null then
      if p_parent = p_id then raise exception 'A categoria nao pode ser pai dela mesma'; end if;
      if exists (
        with recursive up as (
          select c.id, c.parent_id from public.product_categories c where c.id = p_parent
          union all
          select c.id, c.parent_id from public.product_categories c join up on c.id = up.parent_id
        ) select 1 from up where up.id = p_id
      ) then raise exception 'Hierarquia circular'; end if;
    end if;
  end if;

  if exists (
    select 1 from public.product_categories c
    where c.store_id = p_store and lower(c.name) = lower(v_name)
      and c.parent_id is not distinct from p_parent
      and c.id <> coalesce(p_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then raise exception 'Ja existe uma categoria com esse nome neste nivel'; end if;

  if p_id is null then
    insert into public.product_categories (store_id, name, slug, parent_id, active)
    values (p_store, v_name, v_slug, p_parent, coalesce(p_active, true))
    returning id into v_id;
  else
    update public.product_categories
       set name = v_name, slug = v_slug, parent_id = p_parent, active = coalesce(p_active, true), updated_at = now()
     where id = p_id and store_id = p_store
    returning id into v_id;
    if v_id is null then raise exception 'Categoria nao encontrada'; end if;
    update public.products set category = v_name where category_id = v_id and store_id = p_store;
  end if;
  return v_id;
end $$;
revoke all on function public.gestor_category_save(uuid, text, uuid, uuid, boolean) from public, anon;
grant execute on function public.gestor_category_save(uuid, text, uuid, uuid, boolean) to authenticated;

-- Marcas
create or replace function public.gestor_brands(p_store uuid)
returns table(id uuid, name text, active boolean, products bigint)
language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query
    select b.id, b.name, coalesce(b.active, true),
           (select count(*) from public.products p where p.brand_id = b.id)
    from public.brands b
    where b.store_id = p_store
    order by b.name;
end $$;
revoke all on function public.gestor_brands(uuid) from public, anon;
grant execute on function public.gestor_brands(uuid) to authenticated;

create or replace function public.gestor_brand_save(
  p_store uuid, p_name text, p_id uuid default null, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare v_id uuid; v_name text := btrim(coalesce(p_name, ''));
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  if v_name = '' then raise exception 'Informe o nome da marca'; end if;
  if p_id is null then
    insert into public.brands (store_id, name, active) values (p_store, v_name, coalesce(p_active, true)) returning id into v_id;
  else
    update public.brands set name = v_name, active = coalesce(p_active, true), updated_at = now()
     where id = p_id and store_id = p_store returning id into v_id;
    if v_id is null then raise exception 'Marca nao encontrada'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'Ja existe uma marca com esse nome';
end $$;
revoke all on function public.gestor_brand_save(uuid, text, uuid, boolean) from public, anon;
grant execute on function public.gestor_brand_save(uuid, text, uuid, boolean) to authenticated;

-- Classificacao do produto (categoria e marca)
create or replace function public.gestor_product_set_catalog(p_product uuid, p_category uuid, p_brand uuid)
returns void language plpgsql security definer set search_path = public, erp as $$
declare v_store uuid; v_cat_name text;
begin
  select store_id into v_store from public.products where id = p_product;
  if v_store is null then raise exception 'Produto nao encontrado'; end if;
  if not public.gestor_can_write(v_store) then raise exception 'Sem permissao para editar'; end if;
  if p_category is not null then
    select name into v_cat_name from public.product_categories where id = p_category and store_id = v_store;
    if v_cat_name is null then raise exception 'Categoria invalida'; end if;
  end if;
  if p_brand is not null and not exists (select 1 from public.brands where id = p_brand and store_id = v_store) then
    raise exception 'Marca invalida';
  end if;
  update public.products
     set category_id = p_category,
         brand_id = p_brand,
         category = coalesce(v_cat_name, category),
         updated_at = now()
   where id = p_product;
end $$;
revoke all on function public.gestor_product_set_catalog(uuid, uuid, uuid) from public, anon;
grant execute on function public.gestor_product_set_catalog(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

select 'categorias' as item, count(*)::text as valor from public.product_categories
union all select 'marcas', count(*)::text from public.brands
union all select 'gtin_ok', erp.gtin_valid('7891000100103')::text;