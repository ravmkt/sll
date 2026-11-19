-- GESTOR Fase 1: papeis, marcas, fornecedores e estoque critico

-- Papeis em store_members (remove checks antigos sobre role e recria)
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.store_members'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.store_members drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.store_members add constraint store_members_role_check
  check (role in ('owner','admin','operador','financeiro','vendedor','contador'));

create or replace function public.gestor_can_write(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid())
      or exists (select 1 from public.store_members m
                 where m.store_id = p_store and m.user_id = auth.uid()
                   and m.role in ('owner','admin','operador'))
$$;
revoke all on function public.gestor_can_write(uuid) from public, anon;
grant execute on function public.gestor_can_write(uuid) to authenticated;

-- Marcas (public: usadas por varios modulos)
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_brands_name on public.brands (store_id, lower(name));
alter table public.brands enable row level security;
drop policy if exists brands_select on public.brands;
create policy brands_select on public.brands for select using (public.is_store_owner_or_member(store_id));
drop policy if exists brands_write on public.brands;
create policy brands_write on public.brands for all
  using (public.gestor_can_write(store_id)) with check (public.gestor_can_write(store_id));
grant select, insert, update, delete on public.brands to authenticated;
grant all on public.brands to service_role;
alter table public.products add column if not exists brand_id uuid references public.brands(id) on delete set null;

-- Fornecedores (erp: exclusivo do Gestor)
create table if not exists erp.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  document text,
  email text,
  phone text,
  contact_name text,
  lead_time_days integer,
  payment_terms text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_suppliers_name on erp.suppliers (store_id, lower(name));
drop trigger if exists set_updated_at on erp.suppliers;
create trigger set_updated_at before update on erp.suppliers
  for each row execute function public.trigger_set_updated_at();
alter table erp.suppliers enable row level security;
drop policy if exists suppliers_select on erp.suppliers;
create policy suppliers_select on erp.suppliers for select using (public.is_store_owner_or_member(store_id));
grant select on erp.suppliers to authenticated;
grant all on erp.suppliers to service_role;

create or replace function public.gestor_suppliers(p_store uuid)
returns setof erp.suppliers language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query select * from erp.suppliers where store_id = p_store order by active desc, name;
end $$;
revoke all on function public.gestor_suppliers(uuid) from public, anon;
grant execute on function public.gestor_suppliers(uuid) to authenticated;

create or replace function public.gestor_supplier_save(
  p_store uuid, p_name text, p_id uuid default null, p_document text default null,
  p_email text default null, p_phone text default null, p_contact text default null,
  p_lead_time integer default null, p_terms text default null, p_notes text default null,
  p_active boolean default true)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare v_id uuid; v_name text := btrim(coalesce(p_name, ''));
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  if v_name = '' then raise exception 'Informe o nome do fornecedor'; end if;
  if p_id is null then
    insert into erp.suppliers (store_id, name, document, email, phone, contact_name, lead_time_days, payment_terms, notes, active)
    values (p_store, v_name, nullif(btrim(p_document), ''), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''),
            nullif(btrim(p_contact), ''), p_lead_time, nullif(btrim(p_terms), ''), nullif(btrim(p_notes), ''), coalesce(p_active, true))
    returning id into v_id;
  else
    update erp.suppliers set name = v_name, document = nullif(btrim(p_document), ''), email = nullif(btrim(p_email), ''),
      phone = nullif(btrim(p_phone), ''), contact_name = nullif(btrim(p_contact), ''), lead_time_days = p_lead_time,
      payment_terms = nullif(btrim(p_terms), ''), notes = nullif(btrim(p_notes), ''), active = coalesce(p_active, true)
    where id = p_id and store_id = p_store returning id into v_id;
    if v_id is null then raise exception 'Fornecedor nao encontrado'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'Ja existe um fornecedor com esse nome';
end $$;
revoke all on function public.gestor_supplier_save(uuid, text, uuid, text, text, text, text, integer, text, text, boolean) from public, anon;
grant execute on function public.gestor_supplier_save(uuid, text, uuid, text, text, text, text, integer, text, text, boolean) to authenticated;

-- Estoque critico (stock <= min_stock)
create or replace function public.gestor_low_stock(p_store uuid)
returns table(variant_id uuid, product_id uuid, product_name text, sku text, title text, stock integer, min_stock integer)
language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query
    select v.id, p.id, p.name, v.sku, v.title, coalesce(v.stock, 0)::integer, coalesce(v.min_stock, 0)::integer
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.store_id = p_store and coalesce(p.active, true)
      and coalesce(v.stock, 0) <= coalesce(v.min_stock, 0)
    order by (coalesce(v.stock, 0) - coalesce(v.min_stock, 0)), p.name
    limit 200;
end $$;
revoke all on function public.gestor_low_stock(uuid) from public, anon;
grant execute on function public.gestor_low_stock(uuid) to authenticated;

notify pgrst, 'reload schema';

select 'brands' as item, count(*)::text as valor from public.brands
union all select 'suppliers', count(*)::text from erp.suppliers
union all select 'roles', string_agg(distinct role, ',') from public.store_members;