-- Regras fiscais (pacote NCM/CEST/CFOP) vinculadas a categorias, com heranca pelo pai

create table if not exists erp.fiscal_profiles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  ncm text not null,
  cest text,
  cfop text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_profiles_ncm_chk check (ncm ~ '^[0-9]{8}$'),
  constraint fiscal_profiles_cest_chk check (cest is null or cest ~ '^[0-9]{7}$'),
  constraint fiscal_profiles_cfop_chk check (cfop is null or cfop ~ '^[0-9]{4}$')
);
create unique index if not exists uq_fiscal_profiles_name on erp.fiscal_profiles (store_id, lower(name));
drop trigger if exists set_updated_at on erp.fiscal_profiles;
create trigger set_updated_at before update on erp.fiscal_profiles
  for each row execute function public.trigger_set_updated_at();
alter table erp.fiscal_profiles enable row level security;
drop policy if exists fiscal_profiles_select on erp.fiscal_profiles;
create policy fiscal_profiles_select on erp.fiscal_profiles for select
  using (public.is_store_owner_or_member(store_id));
grant select on erp.fiscal_profiles to authenticated;
grant all on erp.fiscal_profiles to service_role;

alter table public.product_categories
  add column if not exists fiscal_profile_id uuid references erp.fiscal_profiles(id) on delete set null;

-- Regra da categoria ou do ancestral mais proximo
create or replace function erp.category_fiscal_profile(p_category uuid)
returns uuid language sql stable security definer set search_path = public, erp as $$
  with recursive up as (
    select id, parent_id, fiscal_profile_id, 0 as d
      from public.product_categories where id = p_category
    union all
    select c.id, c.parent_id, c.fiscal_profile_id, up.d + 1
      from public.product_categories c join up on c.id = up.parent_id
     where up.d < 10
  )
  select u.fiscal_profile_id
    from up u
    join erp.fiscal_profiles f on f.id = u.fiscal_profile_id and f.active
   order by u.d limit 1;
$$;
revoke all on function erp.category_fiscal_profile(uuid) from public, anon, authenticated;

-- Produto sem NCM recebe o pacote; com NCM proprio, so o CFOP faltante
create or replace function public.trg_products_fiscal_from_category()
returns trigger language plpgsql security definer set search_path = public, erp as $$
declare
  v_pid uuid;
  fp erp.fiscal_profiles;
  v_old jsonb := coalesce(new.tax, '{}'::jsonb);
  v_tax jsonb := coalesce(new.tax, '{}'::jsonb);
begin
  if new.category_id is null then return new; end if;
  v_pid := erp.category_fiscal_profile(new.category_id);
  if v_pid is null then return new; end if;
  select * into fp from erp.fiscal_profiles where id = v_pid and active;
  if not found then return new; end if;

  if public.gestor_digits(v_tax->>'ncm') is null then
    v_tax := v_tax || jsonb_strip_nulls(jsonb_build_object('ncm', fp.ncm, 'cest', fp.cest, 'cfop', fp.cfop));
  elsif public.gestor_digits(v_tax->>'cfop') is null and fp.cfop is not null then
    v_tax := v_tax || jsonb_build_object('cfop', fp.cfop);
  end if;

  if v_tax is distinct from v_old then new.tax := v_tax; end if;
  return new;
end $$;

drop trigger if exists trg_products_fiscal_from_category on public.products;
create trigger trg_products_fiscal_from_category
  before insert or update of category_id, tax on public.products
  for each row execute function public.trg_products_fiscal_from_category();

-- RPCs
create or replace function public.gestor_fiscal_profiles(p_store uuid)
returns table(id uuid, name text, ncm text, cest text, cfop text, description text, active boolean, categories integer)
language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query
    select f.id, f.name, f.ncm, f.cest, f.cfop, f.description, f.active,
           (select count(*)::integer from public.product_categories c where c.fiscal_profile_id = f.id)
      from erp.fiscal_profiles f
     where f.store_id = p_store
     order by f.active desc, f.name;
end $$;
revoke all on function public.gestor_fiscal_profiles(uuid) from public, anon;
grant execute on function public.gestor_fiscal_profiles(uuid) to authenticated;

create or replace function public.gestor_fiscal_profile_save(
  p_store uuid, p_id uuid, p_name text, p_ncm text, p_cest text, p_cfop text,
  p_description text, p_active boolean)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_ncm text := regexp_replace(coalesce(p_ncm, ''), '\D', '', 'g');
  v_cest text := nullif(regexp_replace(coalesce(p_cest, ''), '\D', '', 'g'), '');
  v_cfop text := nullif(regexp_replace(coalesce(p_cfop, ''), '\D', '', 'g'), '');
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  if v_name = '' then raise exception 'Informe o nome da regra'; end if;
  if length(v_ncm) <> 8 then raise exception 'NCM deve ter 8 digitos'; end if;
  if v_cest is not null and length(v_cest) <> 7 then raise exception 'CEST deve ter 7 digitos'; end if;
  if v_cfop is not null and length(v_cfop) <> 4 then raise exception 'CFOP deve ter 4 digitos'; end if;
  if p_id is null then
    insert into erp.fiscal_profiles (store_id, name, ncm, cest, cfop, description, active)
    values (p_store, v_name, v_ncm, v_cest, v_cfop, nullif(btrim(p_description), ''), coalesce(p_active, true))
    returning id into v_id;
  else
    update erp.fiscal_profiles set name = v_name, ncm = v_ncm, cest = v_cest, cfop = v_cfop,
           description = nullif(btrim(p_description), ''), active = coalesce(p_active, true)
     where id = p_id and store_id = p_store returning id into v_id;
    if v_id is null then raise exception 'Regra nao encontrada'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'Ja existe uma regra com esse nome';
end $$;
revoke all on function public.gestor_fiscal_profile_save(uuid, uuid, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.gestor_fiscal_profile_save(uuid, uuid, text, text, text, text, text, boolean) to authenticated;

create or replace function public.gestor_category_set_fiscal(p_store uuid, p_category uuid, p_profile uuid)
returns void language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  if not exists (select 1 from public.product_categories where id = p_category and store_id = p_store) then
    raise exception 'Categoria nao encontrada';
  end if;
  if p_profile is not null and not exists (select 1 from erp.fiscal_profiles where id = p_profile and store_id = p_store) then
    raise exception 'Regra nao encontrada';
  end if;
  update public.product_categories set fiscal_profile_id = p_profile where id = p_category;
end $$;
revoke all on function public.gestor_category_set_fiscal(uuid, uuid, uuid) from public, anon;
grant execute on function public.gestor_category_set_fiscal(uuid, uuid, uuid) to authenticated;

-- Aplica as regras aos produtos existentes (o trigger faz o preenchimento sem sobrescrever)
create or replace function public.gestor_fiscal_apply(p_store uuid)
returns jsonb language plpgsql security definer set search_path = public, erp as $$
declare v_before int; v_after int; v_var int; v_nocat int;
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  select count(*) into v_before from public.products
   where store_id = p_store and public.gestor_digits(tax->>'ncm') is null;

  update public.products set tax = coalesce(tax, '{}'::jsonb)
   where store_id = p_store and category_id is not null
     and (public.gestor_digits(tax->>'ncm') is null or public.gestor_digits(tax->>'cfop') is null);

  select count(*) into v_after from public.products
   where store_id = p_store and public.gestor_digits(tax->>'ncm') is null;
  select count(*) into v_var from public.gestor_variant_fiscal where store_id = p_store and not ncm_ok;
  select count(*) into v_nocat from public.products
   where store_id = p_store and category_id is null and public.gestor_digits(tax->>'ncm') is null;

  return jsonb_build_object(
    'produtos_preenchidos', v_before - v_after,
    'produtos_sem_ncm', v_after,
    'variacoes_sem_ncm', v_var,
    'produtos_sem_categoria', v_nocat);
end $$;
revoke all on function public.gestor_fiscal_apply(uuid) from public, anon;
grant execute on function public.gestor_fiscal_apply(uuid) to authenticated;

notify pgrst, 'reload schema';

select
  (select count(*) from erp.fiscal_profiles) as regras,
  (select count(*) from public.gestor_variant_fiscal where not ncm_ok) as variacoes_sem_ncm,
  (select count(*) from public.products where category_id is null and coalesce(tax->>'ncm', '') = '') as sem_categoria_e_sem_ncm;