-- 1) SKU em minusculas (exceto produtos Yampi, que dependem do SKU exato da plataforma)
create or replace function public.trg_products_sku_lower()
returns trigger language plpgsql as $$
begin
  if new.sku is not null and coalesce(new.origin, 'manual') <> 'yampi' then
    new.sku := lower(btrim(new.sku));
  end if;
  return new;
end $$;

drop trigger if exists trg_products_sku_lower on public.products;
create trigger trg_products_sku_lower
  before insert or update of sku on public.products
  for each row execute function public.trg_products_sku_lower();

create or replace function public.trg_variants_sku_lower()
returns trigger language plpgsql as $$
declare v_origin text;
begin
  if new.sku is not null then
    select coalesce(origin, 'manual') into v_origin from public.products where id = new.product_id;
    if coalesce(v_origin, 'manual') <> 'yampi' then
      new.sku := lower(btrim(new.sku));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_variants_sku_lower on public.product_variants;
create trigger trg_variants_sku_lower
  before insert or update of sku on public.product_variants
  for each row execute function public.trg_variants_sku_lower();

-- 2) Produto simples manual sempre tem 1 variacao padrao (SKU = SKU do produto)
create or replace function public.trg_products_default_variant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fmt text := coalesce(to_jsonb(new)->>'format', 'simple');
  v_cnt int;
  v_vid uuid;
  v_sku text;
begin
  if coalesce(new.origin, 'manual') <> 'manual' or v_fmt <> 'simple' then return new; end if;

  select count(*), min(id::text)::uuid into v_cnt, v_vid
  from public.product_variants where product_id = new.id;

  v_sku := lower(btrim(coalesce(nullif(btrim(new.sku), ''), 'p-' || left(new.id::text, 8))));

  if v_cnt = 0 then
    insert into public.product_variants (store_id, product_id, sku, title, price, stock, position)
    values (new.store_id, new.id, v_sku, new.name, new.price, 0, 0);
  elsif v_cnt = 1 then
    update public.product_variants
       set sku = v_sku, title = new.name, price = new.price
     where id = v_vid
       and option_value is null and option_name is null
       and (sku is distinct from v_sku or title is distinct from new.name or price is distinct from new.price);
  end if;
  return new;
end $$;

drop trigger if exists trg_products_default_variant on public.products;
create trigger trg_products_default_variant
  after insert or update on public.products
  for each row execute function public.trg_products_default_variant();

-- 3) Corrige o que ja existe
update public.products
   set sku = lower(btrim(sku))
 where sku is not null and coalesce(origin, 'manual') <> 'yampi' and sku <> lower(btrim(sku));

update public.product_variants v
   set sku = lower(btrim(v.sku))
  from public.products p
 where p.id = v.product_id and coalesce(p.origin, 'manual') <> 'yampi'
   and v.sku is not null and v.sku <> lower(btrim(v.sku));

update public.products p
   set name = p.name
 where coalesce(p.origin, 'manual') = 'manual'
   and not exists (select 1 from public.product_variants v where v.product_id = p.id);

-- Verificacao (esperado: 0 e 0)
select
  (select count(*) from public.products p
    where coalesce(p.origin, 'manual') = 'manual' and coalesce(to_jsonb(p)->>'format', 'simple') = 'simple'
      and not exists (select 1 from public.product_variants v where v.product_id = p.id)) as simples_sem_variacao,
  (select count(*) from public.product_variants v join public.products p on p.id = v.product_id
    where coalesce(p.origin, 'manual') <> 'yampi' and v.sku <> lower(v.sku)) as sku_com_maiuscula;