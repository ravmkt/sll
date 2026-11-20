-- GESTOR: regras de estoque por canal (limite de exibicao + reserva), total por deposito e travas

-- ===== 1. REGRAS POR CANAL =====
create table if not exists erp.channel_stock_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  channel text not null check (channel ~ '^[a-z0-9_]{2,40}$'),
  display_cap integer check (display_cap is null or display_cap >= 0),
  reserve integer check (reserve is null or reserve >= 0),
  warehouse_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_channel_rule unique (store_id, channel),
  constraint rule_default_ck check (channel <> 'default' or (reserve is not null and display_cap is null and warehouse_ids = '{}'::uuid[]))
);

drop trigger if exists set_updated_at on erp.channel_stock_rules;
create trigger set_updated_at before update on erp.channel_stock_rules
  for each row execute function public.trigger_set_updated_at();

alter table erp.channel_stock_rules enable row level security;
drop policy if exists csr_select on erp.channel_stock_rules;
create policy csr_select on erp.channel_stock_rules for select using (public.is_store_owner_or_member(store_id));
grant select on erp.channel_stock_rules to authenticated;
grant all on erp.channel_stock_rules to service_role;

-- padrao da loja: reserva 1 (canal 'default'; cada canal pode substituir)
insert into erp.channel_stock_rules (store_id, channel, reserve)
select s.id, 'default', 1 from public.stores s
on conflict (store_id, channel) do nothing;

-- ===== 2. DEPOSITO PADRAO = "Estoque Principal" =====
update erp.warehouses w set name = 'Estoque Principal'
where w.is_ecommerce and w.name = 'E-commerce'
  and not exists (select 1 from erp.warehouses x where x.store_id = w.store_id and lower(x.name) = 'estoque principal');

create or replace function erp.ecommerce_warehouse(p_store uuid)
returns uuid language plpgsql security definer set search_path = erp, public as $$
declare v uuid;
begin
  select id into v from erp.warehouses where store_id = p_store and is_ecommerce;
  if v is null then
    insert into erp.warehouses (store_id, name, kind, is_ecommerce)
    values (p_store, 'Estoque Principal', 'ecommerce', true) on conflict do nothing;
    select id into v from erp.warehouses where store_id = p_store and is_ecommerce;
  end if;
  return v;
end $$;

create or replace function erp.on_store_created()
returns trigger language plpgsql security definer set search_path = erp, public as $$
begin
  perform erp.ecommerce_warehouse(new.id);
  insert into erp.channel_stock_rules (store_id, channel, reserve)
  values (new.id, 'default', 1) on conflict (store_id, channel) do nothing;
  return new;
end $$;

-- ===== 3. TRAVA DE SALDO NEGATIVO (venda de plataforma continua entrando) =====
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
  if new.qty < 0 and new.balance_after < 0 and new.type <> 'sale' then
    raise exception 'Saldo insuficiente no deposito';
  end if;
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

-- ===== 4. TRANSFERENCIA: agora exige permissao de EDITAR =====
create or replace function public.gestor_stock_transfer(p_variant uuid, p_from uuid, p_to uuid, p_qty integer, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, erp as $$
declare v_store uuid; v_ref text := gen_random_uuid()::text; v_out integer; v_in integer; v_note text;
begin
  select store_id into v_store from public.product_variants where id = p_variant for update;
  if v_store is null then raise exception 'Variacao nao encontrada'; end if;
  if not public.gestor_can(v_store, 'estoque', 'editar') then raise exception 'Sem acesso a esta loja'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantidade invalida'; end if;
  if p_from is null or p_to is null or p_from = p_to then raise exception 'Origem e destino devem ser diferentes'; end if;
  if (select count(*) from erp.warehouses w where w.id in (p_from, p_to) and w.store_id = v_store and w.active) <> 2 then
    raise exception 'Deposito invalido para esta loja';
  end if;
  if erp.warehouse_balance(p_variant, p_from) < p_qty then
    raise exception 'Saldo insuficiente no deposito de origem';
  end if;
  v_note := coalesce(nullif(btrim(p_note), ''), 'Transferencia entre depositos');
  insert into erp.stock_movements (store_id, variant_id, warehouse_id, type, qty, channel, reference, note, created_by)
  values (v_store, p_variant, p_from, 'adjustment', -p_qty, 'transfer', v_ref, v_note, auth.uid())
  returning balance_after into v_out;
  insert into erp.stock_movements (store_id, variant_id, warehouse_id, type, qty, channel, reference, note, created_by)
  values (v_store, p_variant, p_to, 'adjustment', p_qty, 'transfer', v_ref, v_note, auth.uid())
  returning balance_after into v_in;
  return jsonb_build_object('reference', v_ref, 'from_balance', v_out, 'to_balance', v_in);
end $$;

-- ===== 5. RPC: ler regras =====
create or replace function public.gestor_channel_rules(p_store uuid)
returns table(channel text, display_cap integer, reserve integer, warehouse_ids uuid[])
language plpgsql security definer set search_path = public, erp as $$
#variable_conflict use_column
begin
  if not public.gestor_can(p_store, 'estoque', 'ver') then raise exception 'Sem acesso a esta loja'; end if;
  insert into erp.channel_stock_rules (store_id, channel, reserve)
  values (p_store, 'default', 1) on conflict (store_id, channel) do nothing;
  return query
    select r.channel, r.display_cap, r.reserve, r.warehouse_ids
    from erp.channel_stock_rules r where r.store_id = p_store
    order by (r.channel = 'default') desc, r.channel;
end $$;
revoke all on function public.gestor_channel_rules(uuid) from public, anon;
grant execute on function public.gestor_channel_rules(uuid) to authenticated;

-- ===== 6. RPC: salvar regra (canal 'default' = padrao da loja) =====
create or replace function public.gestor_channel_rule_save(
  p_store uuid, p_channel text, p_display_cap integer default null,
  p_reserve integer default null, p_warehouse_ids uuid[] default '{}'::uuid[])
returns void language plpgsql security definer set search_path = public, erp as $$
declare v_ch text := lower(btrim(coalesce(p_channel, '')));
begin
  if not public.gestor_can(p_store, 'estoque', 'editar') then raise exception 'Sem acesso a esta loja'; end if;
  if v_ch !~ '^[a-z0-9_]{2,40}$' then raise exception 'Canal invalido'; end if;
  if p_display_cap is not null and p_display_cap < 0 then raise exception 'Limite de exibicao invalido'; end if;
  if p_reserve is not null and p_reserve < 0 then raise exception 'Reserva invalida'; end if;
  p_warehouse_ids := coalesce(p_warehouse_ids, '{}'::uuid[]);
  if v_ch = 'default' then
    p_display_cap := null; p_warehouse_ids := '{}'::uuid[]; p_reserve := coalesce(p_reserve, 1);
  end if;
  if exists (
    select 1 from unnest(p_warehouse_ids) x
    where not exists (select 1 from erp.warehouses w where w.id = x and w.store_id = p_store)
  ) then raise exception 'Deposito invalido para esta loja'; end if;
  insert into erp.channel_stock_rules (store_id, channel, display_cap, reserve, warehouse_ids)
  values (p_store, v_ch, p_display_cap, p_reserve, p_warehouse_ids)
  on conflict (store_id, channel) do update
    set display_cap = excluded.display_cap, reserve = excluded.reserve,
        warehouse_ids = excluded.warehouse_ids, updated_at = now();
end $$;
revoke all on function public.gestor_channel_rule_save(uuid, text, integer, integer, uuid[]) from public, anon;
grant execute on function public.gestor_channel_rule_save(uuid, text, integer, integer, uuid[]) to authenticated;

-- ===== 7. RPC: visao geral (total, por deposito e disponivel por canal) =====
-- disponivel = min(limite, max(0, saldo dos depositos do canal - reserva))
create or replace function public.gestor_stock_overview(p_store uuid, p_channels text[] default array['yampi','mercadolivre','tiktok'])
returns table(variant_id uuid, total integer, by_warehouse jsonb, by_channel jsonb)
language plpgsql security definer set search_path = public, erp as $$
#variable_conflict use_column
begin
  if not public.gestor_can(p_store, 'estoque', 'ver') then raise exception 'Sem acesso a esta loja'; end if;
  perform erp.ecommerce_warehouse(p_store);
  return query
  with wh as (
    select w.id, w.is_ecommerce from erp.warehouses w where w.store_id = p_store and w.active
  ),
  bal as (
    select v.id as vid, w.id as wid,
           coalesce(s.qty, case when w.is_ecommerce then coalesce(v.stock, 0) else 0 end) as q
    from public.product_variants v
    cross join wh w
    left join erp.warehouse_stock s on s.warehouse_id = w.id and s.variant_id = v.id
    where v.store_id = p_store
  ),
  rule as (
    select c.ch as channel, r.display_cap as cap, coalesce(r.reserve, d.reserve, 1) as reserve,
           coalesce(r.warehouse_ids, '{}'::uuid[]) as wids
    from unnest(p_channels) as c(ch)
    left join erp.channel_stock_rules r on r.store_id = p_store and r.channel = c.ch
    left join erp.channel_stock_rules d on d.store_id = p_store and d.channel = 'default'
  ),
  av as (
    select b.vid, ru.channel,
           least(coalesce(ru.cap, 2147483647),
                 greatest(0, coalesce(sum(b.q) filter (where cardinality(ru.wids) = 0 or b.wid = any(ru.wids)), 0) - ru.reserve))::integer as avail
    from bal b cross join rule ru
    group by b.vid, ru.channel, ru.cap, ru.reserve, ru.wids
  ),
  tot as (
    select b.vid, sum(b.q)::integer as total_qty, jsonb_object_agg(b.wid::text, b.q) as bw
    from bal b group by b.vid
  ),
  avj as (
    select a.vid, jsonb_object_agg(a.channel, a.avail) as bc from av a group by a.vid
  )
  select v.id, coalesce(t.total_qty, 0), coalesce(t.bw, '{}'::jsonb), coalesce(j.bc, '{}'::jsonb)
  from public.product_variants v
  left join tot t on t.vid = v.id
  left join avj j on j.vid = v.id
  where v.store_id = p_store;
end $$;
revoke all on function public.gestor_stock_overview(uuid, text[]) from public, anon;
grant execute on function public.gestor_stock_overview(uuid, text[]) to authenticated;

notify pgrst, 'reload schema';

-- ===== CONFERENCIA =====
select 'lojas' as item, count(*)::text as valor from public.stores
union all select 'regras_padrao', count(*)::text from erp.channel_stock_rules where channel = 'default'
union all select 'deposito_estoque_principal', count(*)::text from erp.warehouses where name = 'Estoque Principal'
union all select 'saldos_negativos', count(*)::text from erp.warehouse_stock where qty < 0
union all select 'divergencias_principal_x_stock', count(*)::text
  from public.product_variants v
  join erp.warehouse_stock s on s.variant_id = v.id
  join erp.warehouses w on w.id = s.warehouse_id and w.is_ecommerce
  where v.stock is distinct from s.qty;