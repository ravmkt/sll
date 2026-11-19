-- GESTOR: depositos (multi-estoque), transferencia, flag gestor_master e registro do PDV

-- ===== DEPOSITOS =====
create table if not exists erp.warehouses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  kind text not null default 'physical' check (kind in ('ecommerce','physical','other')),
  is_ecommerce boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouses_ecom_kind check (not is_ecommerce or kind = 'ecommerce')
);
create unique index if not exists uq_warehouses_ecom on erp.warehouses (store_id) where is_ecommerce;
create unique index if not exists uq_warehouses_name on erp.warehouses (store_id, lower(name));

drop trigger if exists set_updated_at on erp.warehouses;
create trigger set_updated_at before update on erp.warehouses
  for each row execute function public.trigger_set_updated_at();

create table if not exists erp.warehouse_stock (
  warehouse_id uuid not null references erp.warehouses(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  qty integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (warehouse_id, variant_id)
);
create index if not exists idx_wh_stock_variant on erp.warehouse_stock (variant_id);
create index if not exists idx_wh_stock_store on erp.warehouse_stock (store_id);

alter table erp.stock_movements add column if not exists warehouse_id uuid references erp.warehouses(id);
create index if not exists idx_stock_mov_wh on erp.stock_movements (warehouse_id, created_at desc);

-- RLS: leitura para membros; escrita so por funcoes security definer
alter table erp.warehouses enable row level security;
alter table erp.warehouse_stock enable row level security;
drop policy if exists wh_select on erp.warehouses;
create policy wh_select on erp.warehouses for select using (public.is_store_owner_or_member(store_id));
drop policy if exists wh_stock_select on erp.warehouse_stock;
create policy wh_stock_select on erp.warehouse_stock for select using (public.is_store_owner_or_member(store_id));
grant select on erp.warehouses, erp.warehouse_stock to authenticated;
grant all on erp.warehouses, erp.warehouse_stock to service_role;

-- ===== HELPERS =====
create or replace function erp.ecommerce_warehouse(p_store uuid)
returns uuid language plpgsql security definer set search_path = erp, public as $$
declare v uuid;
begin
  select id into v from erp.warehouses where store_id = p_store and is_ecommerce;
  if v is null then
    insert into erp.warehouses (store_id, name, kind, is_ecommerce)
    values (p_store, 'E-commerce', 'ecommerce', true) on conflict do nothing;
    select id into v from erp.warehouses where store_id = p_store and is_ecommerce;
  end if;
  return v;
end $$;

create or replace function erp.warehouse_balance(p_variant uuid, p_wh uuid)
returns integer language sql stable security definer set search_path = erp, public as $$
  select coalesce(
    (select s.qty from erp.warehouse_stock s where s.warehouse_id = p_wh and s.variant_id = p_variant),
    (select case when w.is_ecommerce then coalesce(v.stock, 0) else 0 end
       from erp.warehouses w, public.product_variants v where w.id = p_wh and v.id = p_variant),
    0)
$$;
revoke all on function erp.ecommerce_warehouse(uuid) from public, anon, authenticated;
revoke all on function erp.warehouse_balance(uuid, uuid) from public, anon, authenticated;

create or replace function erp.on_store_created()
returns trigger language plpgsql security definer set search_path = erp, public as $$
begin
  perform erp.ecommerce_warehouse(new.id);
  return new;
end $$;
drop trigger if exists trg_store_default_warehouse on public.stores;
create trigger trg_store_default_warehouse after insert on public.stores
  for each row execute function erp.on_store_created();

-- ===== DADOS INICIAIS =====
insert into erp.warehouses (store_id, name, kind, is_ecommerce)
select s.id, 'E-commerce', 'ecommerce', true from public.stores s
on conflict do nothing;

update erp.stock_movements m set warehouse_id = w.id
from erp.warehouses w
where w.store_id = m.store_id and w.is_ecommerce and m.warehouse_id is null;

insert into erp.warehouse_stock (warehouse_id, variant_id, store_id, qty)
select w.id, v.id, v.store_id, coalesce(v.stock, 0)
from public.product_variants v
join erp.warehouses w on w.store_id = v.store_id and w.is_ecommerce
on conflict (warehouse_id, variant_id) do nothing;

-- ===== TRIGGERS DE ESTOQUE (agora por deposito) =====
-- product_variants.stock continua sendo o saldo do deposito de e-commerce
create or replace function erp.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = erp, public as $$
declare v_stock integer; v_store uuid; v_is_ecom boolean; v_cur integer;
begin
  if current_setting('erp.skip_apply', true) = '1' then
    if new.warehouse_id is null then new.warehouse_id := erp.ecommerce_warehouse(new.store_id); end if;
    return new;
  end if;
  select store_id, coalesce(stock, 0) into v_store, v_stock
    from public.product_variants where id = new.variant_id for update;
  if not found then raise exception 'Variacao % nao encontrada', new.variant_id; end if;
  new.store_id := v_store;
  if new.warehouse_id is null then new.warehouse_id := erp.ecommerce_warehouse(v_store); end if;
  select w.is_ecommerce into v_is_ecom from erp.warehouses w
    where w.id = new.warehouse_id and w.store_id = v_store and w.active;
  if not found then raise exception 'Deposito invalido para esta loja'; end if;
  select s.qty into v_cur from erp.warehouse_stock s
    where s.warehouse_id = new.warehouse_id and s.variant_id = new.variant_id for update;
  if not found then v_cur := case when v_is_ecom then v_stock else 0 end; end if;
  new.balance_after := v_cur + new.qty;
  insert into erp.warehouse_stock (warehouse_id, variant_id, store_id, qty)
    values (new.warehouse_id, new.variant_id, v_store, new.balance_after)
    on conflict (warehouse_id, variant_id) do update set qty = excluded.qty, updated_at = now();
  if v_is_ecom then
    perform set_config('erp.applying', '1', true);
    update public.product_variants set stock = new.balance_after, updated_at = now() where id = new.variant_id;
    perform set_config('erp.applying', '0', true);
  end if;
  return new;
end $$;

create or replace function erp.guard_variant_stock()
returns trigger language plpgsql security definer set search_path = erp, public as $$
declare v_wh uuid;
begin
  if new.stock is not distinct from old.stock then return new; end if;
  if current_setting('erp.applying', true) = '1' then return new; end if;
  v_wh := erp.ecommerce_warehouse(new.store_id);
  perform set_config('erp.skip_apply', '1', true);
  insert into erp.stock_movements (store_id, variant_id, warehouse_id, type, qty, balance_after, channel, note)
  values (new.store_id, new.id, v_wh, 'adjustment', coalesce(new.stock, 0) - coalesce(old.stock, 0), coalesce(new.stock, 0), 'direct', 'Alteracao direta do saldo');
  perform set_config('erp.skip_apply', '0', true);
  insert into erp.warehouse_stock (warehouse_id, variant_id, store_id, qty)
    values (v_wh, new.id, new.store_id, coalesce(new.stock, 0))
    on conflict (warehouse_id, variant_id) do update set qty = excluded.qty, updated_at = now();
  return new;
end $$;

create or replace function erp.log_variant_insert()
returns trigger language plpgsql security definer set search_path = erp, public as $$
declare v_wh uuid;
begin
  v_wh := erp.ecommerce_warehouse(new.store_id);
  insert into erp.warehouse_stock (warehouse_id, variant_id, store_id, qty)
    values (v_wh, new.id, new.store_id, coalesce(new.stock, 0))
    on conflict (warehouse_id, variant_id) do update set qty = excluded.qty, updated_at = now();
  if coalesce(new.stock, 0) = 0 then return new; end if;
  perform set_config('erp.skip_apply', '1', true);
  insert into erp.stock_movements (store_id, variant_id, warehouse_id, type, qty, balance_after, channel, note)
  values (new.store_id, new.id, v_wh, 'initial', new.stock, new.stock, 'direct', 'Variacao criada com saldo');
  perform set_config('erp.skip_apply', '0', true);
  return new;
end $$;

alter table erp.stock_movements alter column warehouse_id set not null;

-- ===== RPCs (front) =====
drop function if exists public.gestor_stock_move(uuid, text, integer, text);
create or replace function public.gestor_stock_move(p_variant uuid, p_type text, p_qty integer, p_note text default null, p_warehouse uuid default null)
returns integer language plpgsql security definer set search_path = public, erp as $$
declare v_store uuid; v_bal integer;
begin
  select store_id into v_store from public.product_variants where id = p_variant;
  if v_store is null then raise exception 'Variacao nao encontrada'; end if;
  if not public.is_store_owner_or_member(v_store) then raise exception 'Sem acesso a esta loja'; end if;
  insert into erp.stock_movements (store_id, variant_id, warehouse_id, type, qty, channel, note)
  values (v_store, p_variant, p_warehouse, p_type, p_qty, 'gestor', p_note)
  returning balance_after into v_bal;
  return v_bal;
end $$;
revoke all on function public.gestor_stock_move(uuid, text, integer, text, uuid) from public, anon;
grant execute on function public.gestor_stock_move(uuid, text, integer, text, uuid) to authenticated;

create or replace function public.gestor_warehouses(p_store uuid)
returns table(id uuid, name text, kind text, is_ecommerce boolean, active boolean)
language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  perform erp.ecommerce_warehouse(p_store);
  return query
    select w.id, w.name, w.kind, w.is_ecommerce, w.active
    from erp.warehouses w where w.store_id = p_store
    order by w.is_ecommerce desc, w.name;
end $$;
revoke all on function public.gestor_warehouses(uuid) from public, anon;
grant execute on function public.gestor_warehouses(uuid) to authenticated;

create or replace function public.gestor_warehouse_save(p_store uuid, p_name text, p_kind text default 'physical', p_id uuid default null, p_active boolean default true)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare v_id uuid; v_name text := btrim(coalesce(p_name, '')); v_kind text;
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  if v_name = '' then raise exception 'Informe o nome do deposito'; end if;
  v_kind := case when p_kind in ('physical','other') then p_kind else 'other' end;
  if p_id is null then
    insert into erp.warehouses (store_id, name, kind) values (p_store, v_name, v_kind) returning id into v_id;
  else
    if not coalesce(p_active, true)
       and exists (select 1 from erp.warehouse_stock s where s.warehouse_id = p_id and s.qty <> 0) then
      raise exception 'Transfira o saldo antes de desativar o deposito';
    end if;
    update erp.warehouses w
       set name = v_name,
           kind = case when w.is_ecommerce then w.kind else v_kind end,
           active = case when w.is_ecommerce then true else coalesce(p_active, true) end
     where w.id = p_id and w.store_id = p_store
    returning w.id into v_id;
    if v_id is null then raise exception 'Deposito nao encontrado'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'Ja existe um deposito com esse nome';
end $$;
revoke all on function public.gestor_warehouse_save(uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.gestor_warehouse_save(uuid, text, text, uuid, boolean) to authenticated;

create or replace function public.gestor_variant_stock(p_variant uuid)
returns table(warehouse_id uuid, name text, is_ecommerce boolean, qty integer)
language plpgsql security definer set search_path = public, erp as $$
declare v_store uuid;
begin
  select v.store_id into v_store from public.product_variants v where v.id = p_variant;
  if v_store is null then raise exception 'Variacao nao encontrada'; end if;
  if not public.is_store_owner_or_member(v_store) then raise exception 'Sem acesso a esta loja'; end if;
  perform erp.ecommerce_warehouse(v_store);
  return query
    select w.id, w.name, w.is_ecommerce, erp.warehouse_balance(p_variant, w.id)
    from erp.warehouses w where w.store_id = v_store and w.active
    order by w.is_ecommerce desc, w.name;
end $$;
revoke all on function public.gestor_variant_stock(uuid) from public, anon;
grant execute on function public.gestor_variant_stock(uuid) to authenticated;

create or replace function public.gestor_stock_transfer(p_variant uuid, p_from uuid, p_to uuid, p_qty integer, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, erp as $$
declare v_store uuid; v_ref text := gen_random_uuid()::text; v_out integer; v_in integer; v_note text;
begin
  select store_id into v_store from public.product_variants where id = p_variant for update;
  if v_store is null then raise exception 'Variacao nao encontrada'; end if;
  if not public.is_store_owner_or_member(v_store) then raise exception 'Sem acesso a esta loja'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantidade invalida'; end if;
  if p_from is null or p_to is null or p_from = p_to then raise exception 'Origem e destino devem ser diferentes'; end if;
  if (select count(*) from erp.warehouses w where w.id in (p_from, p_to) and w.store_id = v_store and w.active) <> 2 then
    raise exception 'Deposito invalido para esta loja';
  end if;
  if erp.warehouse_balance(p_variant, p_from) < p_qty then
    raise exception 'Saldo insuficiente no deposito de origem';
  end if;
  v_note := coalesce(nullif(btrim(p_note), ''), 'Transferencia entre depositos');
  insert into erp.stock_movements (store_id, variant_id, warehouse_id, type, qty, channel, reference, note)
  values (v_store, p_variant, p_from, 'adjustment', -p_qty, 'transfer', v_ref, v_note)
  returning balance_after into v_out;
  insert into erp.stock_movements (store_id, variant_id, warehouse_id, type, qty, channel, reference, note)
  values (v_store, p_variant, p_to, 'adjustment', p_qty, 'transfer', v_ref, v_note)
  returning balance_after into v_in;
  return jsonb_build_object('reference', v_ref, 'from_balance', v_out, 'to_balance', v_in);
end $$;
revoke all on function public.gestor_stock_transfer(uuid, uuid, uuid, integer, text) from public, anon;
grant execute on function public.gestor_stock_transfer(uuid, uuid, uuid, integer, text) to authenticated;

-- ===== FLAG gestor_master (Gestor passa a mandar na plataforma) =====
alter table public.yampi_connections add column if not exists gestor_master boolean not null default false;
alter table public.yampi_connections add column if not exists gestor_master_at timestamptz;

-- ===== REGISTRO DO PDV =====
insert into public.hub_modules (slug, name, status, is_public_for_sale, sort_order, description, benefits, route_path, features)
values ('pdv', 'PDV', 'coming_soon', false, 6,
  U&'Ponto de venda para loja f\00EDsica, integrado ao estoque e aos pedidos.',
  '[]'::jsonb, '/dashboard/modules/pdv', '[]'::jsonb)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';

select 'depositos' as item, count(*)::text as valor from erp.warehouses
union all select 'saldos', count(*)::text from erp.warehouse_stock
union all select 'mov_sem_deposito', count(*)::text from erp.stock_movements where warehouse_id is null
union all select 'divergencias', count(*)::text
  from public.product_variants v
  join erp.warehouse_stock s on s.variant_id = v.id
  join erp.warehouses w on w.id = s.warehouse_id and w.is_ecommerce
  where v.stock is distinct from s.qty
union all select 'pdv', status from public.hub_modules where slug = 'pdv';