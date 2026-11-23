create or replace function public.gestor_digits(t text)
returns text language sql immutable as $$
  select nullif(regexp_replace(coalesce(t, ''), '\D', '', 'g'), '')
$$;

create or replace view public.gestor_variant_fiscal
with (security_invoker = true) as
select f.*,
       (f.ncm is not null and length(f.ncm) = 8) as ncm_ok,
       (f.cest is null or length(f.cest) = 7) as cest_ok
from (
  select
    v.id as variant_id,
    v.sku,
    p.id as product_id,
    p.store_id,
    p.name as product_name,
    coalesce(public.gestor_digits(v.ncm), public.gestor_digits(p.tax->>'ncm')) as ncm,
    coalesce(public.gestor_digits(v.cest), public.gestor_digits(p.tax->>'cest')) as cest,
    case
      when public.gestor_digits(v.ncm) is not null then 'variacao'
      when public.gestor_digits(p.tax->>'ncm') is not null then 'produto'
    end as ncm_source
  from public.product_variants v
  join public.products p on p.id = v.product_id
) f;

grant select on public.gestor_variant_fiscal to authenticated;