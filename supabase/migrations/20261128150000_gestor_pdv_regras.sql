-- 0.2 PDV: regras do gestor (desconto, frete, observação, cliente obrigatório)
begin;

alter table public.gestor_pdv_settings
  add column if not exists customer_required jsonb not null default '{"name":true,"cpf":true,"whatsapp":true}'::jsonb,
  add column if not exists discount_enabled boolean not null default false,
  add column if not exists discount_max_pct numeric(5,2),
  add column if not exists discount_max_value numeric(12,2),
  add column if not exists shipping_enabled boolean not null default false,
  add column if not exists shipping_mode text not null default 'options',
  add column if not exists shipping_options jsonb not null default '[]'::jsonb,
  add column if not exists note_enabled boolean not null default true,
  add column if not exists updated_by uuid;

do $$ begin
  alter table public.gestor_pdv_settings add constraint gestor_pdv_settings_rules_chk check (
    (discount_max_pct is null or (discount_max_pct >= 0 and discount_max_pct <= 100))
    and (discount_max_value is null or discount_max_value >= 0)
    and shipping_mode in ('options','free')
    and jsonb_typeof(shipping_options) = 'array'
    and jsonb_typeof(customer_required) = 'object');
exception when duplicate_object then null; end $$;

create unique index if not exists gestor_pdv_settings_store_uidx on public.gestor_pdv_settings (store_id);

-- gestor = dono da loja, superadmin, ou membro owner/admin ativo
create or replace function public.gestor_pdv_is_manager(p_store uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select auth.uid() is not null and (
    exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid())
    or public.is_superadmin()
    or exists (select 1 from public.store_members m
               where m.store_id = p_store and m.user_id = auth.uid()
                 and coalesce(m.active, true) and m.role in ('owner','admin'))
  )
$function$;

create or replace function public.gestor_pdv_settings_get(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare s public.gestor_pdv_settings%rowtype;
begin
  if not (public.gestor_can(p_store, 'pedidos', 'editar') or public.gestor_can(p_store, 'pedidos', 'ver')) then
    raise exception 'Sem acesso a esta loja';
  end if;
  select * into s from public.gestor_pdv_settings where store_id = p_store;
  return jsonb_build_object(
    'store_id', p_store,
    'is_manager', public.gestor_pdv_is_manager(p_store),
    'default_warehouse_id', s.default_warehouse_id,
    'max_interest_free', coalesce(s.max_interest_free, 1),
    'receipt_width_mm', coalesce(s.receipt_width_mm, 80),
    'customer_required', coalesce(s.customer_required, '{"name":true,"cpf":true,"whatsapp":true}'::jsonb),
    'discount_enabled', coalesce(s.discount_enabled, false),
    'discount_max_pct', s.discount_max_pct,
    'discount_max_value', s.discount_max_value,
    'shipping_enabled', coalesce(s.shipping_enabled, false),
    'shipping_mode', coalesce(s.shipping_mode, 'options'),
    'shipping_options', coalesce(s.shipping_options, '[]'::jsonb),
    'note_enabled', coalesce(s.note_enabled, true),
    'updated_at', s.updated_at,
    'updated_by', s.updated_by);
end $function$;

create or replace function public.gestor_pdv_settings_save(p_store uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  s public.gestor_pdv_settings%rowtype;
  k text; o jsonb;
begin
  if not public.gestor_pdv_is_manager(p_store) then
    raise exception 'Só o gestor pode alterar as regras do PDV';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'Dados inválidos'; end if;

  select * into s from public.gestor_pdv_settings where store_id = p_store;
  if not found then
    s.store_id := p_store; s.max_interest_free := 1; s.receipt_width_mm := 80;
    s.customer_required := '{"name":true,"cpf":true,"whatsapp":true}'::jsonb;
    s.discount_enabled := false; s.shipping_enabled := false; s.shipping_mode := 'options';
    s.shipping_options := '[]'::jsonb; s.note_enabled := true;
  end if;

  if p_data ? 'customer_required' then
    if jsonb_typeof(p_data->'customer_required') <> 'object' then raise exception 'customer_required inválido'; end if;
    for k in select jsonb_object_keys(p_data->'customer_required') loop
      if k not in ('name','cpf','whatsapp') or jsonb_typeof(p_data->'customer_required'->k) <> 'boolean' then
        raise exception 'Campo de cliente inválido: %', k;
      end if;
    end loop;
    s.customer_required := s.customer_required || (p_data->'customer_required');
  end if;

  if p_data ? 'discount_enabled' then s.discount_enabled := (p_data->>'discount_enabled')::boolean; end if;
  if p_data ? 'discount_max_pct' then s.discount_max_pct := nullif(p_data->>'discount_max_pct', '')::numeric; end if;
  if p_data ? 'discount_max_value' then s.discount_max_value := nullif(p_data->>'discount_max_value', '')::numeric; end if;
  if s.discount_max_pct is not null and (s.discount_max_pct < 0 or s.discount_max_pct > 100) then
    raise exception 'O limite em %% deve ficar entre 0 e 100';
  end if;
  if s.discount_max_value is not null and s.discount_max_value < 0 then
    raise exception 'O limite em R$ não pode ser negativo';
  end if;

  if p_data ? 'shipping_enabled' then s.shipping_enabled := (p_data->>'shipping_enabled')::boolean; end if;
  if p_data ? 'shipping_mode' then
    if (p_data->>'shipping_mode') not in ('options','free') then raise exception 'Modo de frete inválido'; end if;
    s.shipping_mode := p_data->>'shipping_mode';
  end if;
  if p_data ? 'shipping_options' then
    if jsonb_typeof(p_data->'shipping_options') <> 'array' then raise exception 'Opções de frete inválidas'; end if;
    if jsonb_array_length(p_data->'shipping_options') > 20 then raise exception 'Máximo de 20 opções de frete'; end if;
    for o in select value from jsonb_array_elements(p_data->'shipping_options') loop
      if jsonb_typeof(o) <> 'object'
         or coalesce(btrim(o->>'label'), '') = ''
         or coalesce(o->>'value', '') !~ '^[0-9]+(\.[0-9]+)?$' then
        raise exception 'Cada opção de frete precisa de nome e valor (R$) válidos';
      end if;
    end loop;
    s.shipping_options := coalesce((
      select jsonb_agg(jsonb_build_object('label', btrim(e->>'label'), 'value', round((e->>'value')::numeric, 2)))
      from jsonb_array_elements(p_data->'shipping_options') e), '[]'::jsonb);
  end if;

  if p_data ? 'note_enabled' then s.note_enabled := (p_data->>'note_enabled')::boolean; end if;

  insert into public.gestor_pdv_settings (
    store_id, default_warehouse_id, max_interest_free, receipt_width_mm, customer_required,
    discount_enabled, discount_max_pct, discount_max_value, shipping_enabled, shipping_mode,
    shipping_options, note_enabled, updated_by, updated_at)
  values (
    p_store, s.default_warehouse_id, s.max_interest_free, s.receipt_width_mm, s.customer_required,
    s.discount_enabled, s.discount_max_pct, s.discount_max_value, s.shipping_enabled, s.shipping_mode,
    s.shipping_options, s.note_enabled, auth.uid(), now())
  on conflict (store_id) do update set
    customer_required = excluded.customer_required,
    discount_enabled = excluded.discount_enabled,
    discount_max_pct = excluded.discount_max_pct,
    discount_max_value = excluded.discount_max_value,
    shipping_enabled = excluded.shipping_enabled,
    shipping_mode = excluded.shipping_mode,
    shipping_options = excluded.shipping_options,
    note_enabled = excluded.note_enabled,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  return public.gestor_pdv_settings_get(p_store);
end $function$;

-- Venda: mesma função de antes + validação das regras (gestor não tem limite)
create or replace function public.gestor_pdv_sale_sync(p_store uuid, p_customer uuid, p_items jsonb, p_discount numeric, p_shipping numeric, p_payments jsonb, p_send_to_expedition boolean DEFAULT false, p_seller uuid DEFAULT NULL::uuid, p_warehouse uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_idem text DEFAULT NULL::text, p_channel text DEFAULT 'pdv'::text, p_sold_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_offline_ref text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'erp'
AS $function$
declare
  v_ch text := coalesce(nullif(btrim(p_channel), ''), 'pdv');
  v_at timestamptz := coalesce(p_sold_at, now());
  v_res jsonb; v_oid uuid; v_sess uuid; v_neg boolean := false;
  v_set public.gestor_pdv_settings%rowtype;
  v_sub numeric; v_disc numeric; v_over text := null;
begin
  if not public.gestor_can(p_store, 'pedidos', 'editar') then
    raise exception 'Sem permissão para vender nesta loja';
  end if;
  if p_sold_at is not null and (p_sold_at > now() + interval '5 minutes' or p_sold_at < now() - interval '4 days') then
    raise exception 'Data da venda fora do período permitido (máximo de 3 dias offline)';
  end if;

  -- regras do PDV definidas pelo gestor (o gestor não tem limite)
  if not public.gestor_pdv_is_manager(p_store) then
    select * into v_set from public.gestor_pdv_settings where store_id = p_store;
    select coalesce(sum((x->>'qty')::numeric * (x->>'unit_price')::numeric), 0),
           coalesce(sum(coalesce((x->>'discount')::numeric, 0)), 0)
      into v_sub, v_disc
      from jsonb_array_elements(p_items) x;
    v_disc := round(v_disc + coalesce(p_discount, 0), 2);

    if v_disc > 0 then
      if not coalesce(v_set.discount_enabled, false) then
        v_over := 'Desconto não liberado para esta loja.';
      elsif v_set.discount_max_pct is not null and v_disc > round(v_sub * v_set.discount_max_pct / 100, 2) then
        v_over := 'Desconto acima do limite de ' || v_set.discount_max_pct || '%.';
      elsif v_set.discount_max_value is not null and v_disc > v_set.discount_max_value then
        v_over := 'Desconto acima do limite de R$ ' || v_set.discount_max_value || '.';
      end if;
    end if;

    if v_over is null and coalesce(p_shipping, 0) > 0 then
      if not coalesce(v_set.shipping_enabled, false) then
        v_over := 'Frete não liberado para esta loja.';
      elsif coalesce(v_set.shipping_mode, 'options') = 'options'
        and not exists (
          select 1 from jsonb_array_elements(coalesce(v_set.shipping_options, '[]'::jsonb)) o
          where round((o->>'value')::numeric, 2) = round(p_shipping, 2)) then
        v_over := 'Frete diferente das opções cadastradas pelo gestor.';
      end if;
    end if;

    if not coalesce(v_set.note_enabled, true) then p_note := null; end if;

    -- online: bloqueia. Offline: a venda já foi feita no balcão, então entra marcada para revisão.
    if v_over is not null and p_offline_ref is null then
      raise exception '%', v_over;
    end if;
  end if;

  -- saldo negativo so passa quando a venda veio da fila offline
  perform set_config('sll.pdv_allow_negative', case when p_offline_ref is not null then '1' else '0' end, true);

  v_res := public.gestor_pdv_sale(
    p_store, p_customer, p_items, p_discount, p_shipping, p_payments, p_send_to_expedition,
    p_seller, p_warehouse, p_note, p_idem, v_ch);

  perform set_config('sll.pdv_allow_negative', '0', true);

  if coalesce((v_res->>'duplicate')::boolean, false) then return v_res; end if;

  v_oid := (v_res->>'order_id')::uuid;

  select exists (select 1 from erp.stock_movements m where m.order_id = v_oid and coalesce(m.balance_after, 0) < 0)
    into v_neg;

  select s.id into v_sess from public.gestor_cash_sessions s
   where s.store_id = p_store and s.channel = v_ch and s.opened_by = auth.uid()
     and s.opened_at <= v_at and (s.closed_at is null or s.closed_at >= v_at)
   order by s.opened_at desc limit 1;

  update public.orders set
    created_at   = v_at,
    paid_at      = case when paid_at is not null then v_at else paid_at end,
    delivered_at = case when delivered_at is not null then v_at else delivered_at end,
    cash_session_id = v_sess,
    offline_ref  = p_offline_ref,
    stock_review = v_neg,
    internal_note = nullif(trim(coalesce(internal_note || E'\n', '')
      || case when v_neg then 'Venda offline com saldo insuficiente: revisar estoque.' else '' end
      || case when v_neg and v_over is not null then E'\n' else '' end
      || case when v_over is not null then 'Venda offline fora das regras do PDV: ' || v_over else '' end), '')
  where id = v_oid;

  return v_res || jsonb_build_object('stock_review', v_neg, 'cash_session_id', v_sess);
end $function$;

revoke all on function public.gestor_pdv_is_manager(uuid) from public, anon;
revoke all on function public.gestor_pdv_settings_get(uuid) from public, anon;
revoke all on function public.gestor_pdv_settings_save(uuid, jsonb) from public, anon;
grant execute on function public.gestor_pdv_is_manager(uuid) to authenticated;
grant execute on function public.gestor_pdv_settings_get(uuid) to authenticated;
grant execute on function public.gestor_pdv_settings_save(uuid, jsonb) to authenticated;

commit;