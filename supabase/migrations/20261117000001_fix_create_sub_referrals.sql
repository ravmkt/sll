create or replace function public.admin_master_create_subscription(
  p_store_id uuid, p_plan_id uuid, p_module_key text, p_cycle text, p_status text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_combo boolean;
  v_slug text;
  v_key text;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_status not in ('active','trialing','lifetime') then raise exception 'Status invalido'; end if;

  select is_combo, module_slug into v_combo, v_slug from public.dynamic_plans where id = p_plan_id;
  if not found then raise exception 'Plano nao encontrado'; end if;

  v_key := case when v_combo then null else v_slug end;
  if not v_combo and coalesce(p_module_key,'') <> coalesce(v_slug,'') then
    raise exception 'O plano escolhido nao pertence a este modulo.';
  end if;

  if exists (select 1 from public.subscriptions
             where store_id = p_store_id and is_current and module_key is not distinct from v_key) then
    raise exception 'Este modulo ja tem assinatura atual. Use Alterar plano.';
  end if;

  begin
    insert into public.subscriptions (store_id, dynamic_plan_id, module_key, status, billing_cycle, is_current, billing_provider)
    values (p_store_id, p_plan_id, v_key, p_status, p_cycle, true, 'manual_admin')
    returning id into v_id;
  exception when not_null_violation then
    raise exception 'A coluna plan_id (tabela plans) e obrigatoria. Envie este erro ao suporte tecnico.';
  end;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'subscription_created',
          jsonb_build_object('store_id', p_store_id, 'subscription_id', v_id, 'module_key', v_key, 'plan_id', p_plan_id, 'status', p_status));
  return v_id;
end $$;
grant execute on function public.admin_master_create_subscription(uuid, uuid, text, text, text) to authenticated;

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
        'plan_name', (select pl.plan_name from public.subscriptions sb
                      join public.dynamic_plans pl on pl.id = sb.dynamic_plan_id
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