-- Lista de planos (corrige module_key: dynamic_plans usa module_slug)
drop function if exists public.admin_master_list_plans();
create function public.admin_master_list_plans()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', to_jsonb(p)->>'name',
    'module_key', to_jsonb(p)->>'module_slug',
    'is_combo', coalesce((to_jsonb(p)->>'is_combo')::boolean, false),
    'is_active', coalesce((to_jsonb(p)->>'is_active')::boolean, true)
  ) order by to_jsonb(p)->>'name') from public.dynamic_plans p), '[]'::jsonb);
end $$;
grant execute on function public.admin_master_list_plans() to authenticated;

-- Metricas, faturas e LTV por periodo (p_days null ou 0 = todo o periodo)
create or replace function public.admin_master_store_period(p_store_id uuid, p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_since timestamptz := case when p_days is null or p_days <= 0 then '-infinity'::timestamptz else now() - make_interval(days => p_days) end;
  v_tbl text; v_events jsonb := '{}'::jsonb; v_inv jsonb; v_paid bigint; v_paid_n int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select format('%I.%I', table_schema, table_name) into v_tbl
  from information_schema.columns
  where table_schema in ('public','vidlytics')
  group by table_schema, table_name
  having bool_or(column_name = 'store_id') and bool_or(column_name = 'event_type') and bool_or(column_name = 'created_at')
  order by (table_name like '%event%') desc, table_name
  limit 1;

  if v_tbl is not null then
    execute format('select coalesce(jsonb_object_agg(event_type, n), ''{}''::jsonb) from (select event_type, count(*) n from %s where store_id::text = $1::text and created_at >= $2 group by 1) x', v_tbl)
      into v_events using p_store_id, v_since;
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc), '[]'::jsonb) into v_inv
  from (select id, amount_cents, status, due_date, paid_at, description, created_at
        from public.invoices where store_id = p_store_id and created_at >= v_since
        order by created_at desc limit 500) i;

  select coalesce(sum(amount_cents), 0), count(*) into v_paid, v_paid_n
  from public.invoices where store_id = p_store_id and status = 'paid';

  return jsonb_build_object('events', v_events, 'events_source', v_tbl, 'invoices', v_inv,
                            'paid_cents', v_paid, 'paid_count', v_paid_n);
end $$;
grant execute on function public.admin_master_store_period(uuid, int) to authenticated;

-- Nova assinatura manual
create or replace function public.admin_master_create_subscription(
  p_store_id uuid, p_plan_id uuid, p_module_key text, p_cycle text, p_status text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_status not in ('active','trialing','lifetime') then raise exception 'Status invalido'; end if;
  if not exists (select 1 from public.dynamic_plans where id = p_plan_id) then raise exception 'Plano nao encontrado'; end if;
  if exists (select 1 from public.subscriptions
             where store_id = p_store_id and is_current and coalesce(module_key,'') = coalesce(p_module_key,'')) then
    raise exception 'Este modulo ja tem assinatura atual. Use Alterar plano.';
  end if;
  insert into public.subscriptions (store_id, plan_id, module_key, status, billing_cycle, is_current, billing_provider)
  values (p_store_id, p_plan_id, nullif(p_module_key,''), p_status, p_cycle, true, 'manual_admin')
  returning id into v_id;
  begin
    insert into public.admin_audit_logs (action, details)
    values ('subscription_created', jsonb_build_object('store_id', p_store_id, 'subscription_id', v_id, 'module_key', p_module_key, 'plan_id', p_plan_id, 'status', p_status));
  exception when others then null;
  end;
  return v_id;
end $$;
grant execute on function public.admin_master_create_subscription(uuid, uuid, text, text, text) to authenticated;

-- Indicacoes: quem indicou + lojas indicadas com plano, status e comissao
create or replace function public.admin_master_store_referrals(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_by jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select jsonb_build_object('id', r.id, 'name', r.name) into v_by
  from public.stores s join public.stores r on r.id = s.referred_by_store_id where s.id = p_store_id;

  return jsonb_build_object('referred_by', v_by, 'list', coalesce((
    select jsonb_agg(t.x order by t.x->>'created_at' desc) from (
      select jsonb_build_object(
        'id', c.id, 'name', c.name, 'created_at', c.created_at,
        'plan_name', (select to_jsonb(pl)->>'name' from public.subscriptions sb join public.dynamic_plans pl on pl.id = sb.plan_id
                      where sb.store_id = c.id and sb.is_current order by sb.created_at desc limit 1),
        'status', (select case when bool_or(sb.status = 'past_due') then 'past_due'
                               when bool_or(sb.status in ('active','lifetime')) then 'active'
                               when bool_or(sb.status = 'trialing') then 'trial' else 'inactive' end
                   from public.subscriptions sb where sb.store_id = c.id and sb.is_current),
        'commission', (select coalesce(sum(coalesce((to_jsonb(rw)->>'amount_cents')::numeric / 100, (to_jsonb(rw)->>'amount')::numeric, 0)), 0)
                       from public.referral_rewards rw where to_jsonb(rw)->>'referred_store_id' = c.id::text)
      ) x
      from public.stores c where c.referred_by_store_id = p_store_id
    ) t), '[]'::jsonb));
end $$;
grant execute on function public.admin_master_store_referrals(uuid) to authenticated;