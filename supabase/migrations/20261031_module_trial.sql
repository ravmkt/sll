-- 1) Admin: libera modulo por N dias, opcionalmente como TRIAL que vence de verdade
drop function if exists public.admin_set_module_access(uuid, text, boolean, integer);

create or replace function public.admin_set_module_access(
  p_store_id uuid, p_module_key text, p_enabled boolean,
  p_days integer default null, p_as_trial boolean default false)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_state text;
  v_plan_id uuid;
  v_status text;
  v_end timestamptz;
  v_has_current boolean;
begin
  if not public.is_superadmin() then
    raise exception 'Acesso negado';
  end if;

  if p_module_key not in ('vidlytics','live_commerce') then
    raise exception 'Módulo inválido: %', p_module_key;
  end if;

  if p_as_trial and p_days is null then
    raise exception 'Trial exige um prazo em dias';
  end if;

  if not exists (select 1 from public.stores where id = p_store_id) then
    raise exception 'Loja não encontrada';
  end if;

  select e->>'state' into v_state
  from jsonb_array_elements(public.admin_get_store_modules(p_store_id)::jsonb) e
  where e->>'module_key' = p_module_key;

  if p_enabled then
    if v_state <> 'off' then
      return json_build_object('success', true, 'result', 'noop',
        'message', 'O módulo já está liberado para esta loja.');
    end if;

    if exists (select 1 from public.subscriptions
               where store_id = p_store_id and module_key = p_module_key and status = 'past_due') then
      raise exception 'A assinatura deste módulo está inadimplente. Resolva antes de liberar manualmente.';
    end if;

    select id into v_plan_id from public.plans
    where slug = case p_module_key when 'vidlytics' then 'individual-vidlytics' else 'individual-live-commerce' end;
    if v_plan_id is null then
      raise exception 'Plano individual do módulo não encontrado';
    end if;

    v_status := case when p_days is null then 'lifetime'
                     when p_as_trial then 'trialing'
                     else 'active' end;
    v_end := case when p_days is null then null else v_now + make_interval(days => p_days) end;

    select exists (select 1 from public.subscriptions
                   where store_id = p_store_id and is_current = true) into v_has_current;

    insert into public.subscriptions (
      store_id, plan_id, status, current_period_start, current_period_end,
      is_current, billing_provider, payment_method, module_key, created_at, updated_at
    ) values (
      p_store_id, v_plan_id, v_status, v_now, v_end,
      not v_has_current, 'manual_admin', null, p_module_key, v_now, v_now
    );

    if not v_has_current then
      update public.stores
      set subscription_status = v_status,
          current_period_end = v_end,
          trial_ends_at = case when v_status = 'trialing' then v_end else null end,
          updated_at = v_now
      where id = p_store_id;
    end if;

  else
    if v_state = 'plan' then
      return json_build_object('success', true, 'result', 'noop',
        'message', 'Módulo incluído no plano da loja. Altere o plano para removê-lo.');
    elsif v_state = 'paid' then
      return json_build_object('success', true, 'result', 'noop',
        'message', 'Assinatura paga. Cancele pelo gateway de cobrança.');
    elsif v_state = 'off' then
      return json_build_object('success', true, 'result', 'noop',
        'message', 'O módulo já está desativado.');
    end if;

    update public.subscriptions
    set status = 'canceled', canceled_at = v_now, updated_at = v_now
    where store_id = p_store_id
      and module_key = p_module_key
      and billing_provider = 'manual_admin'
      and status in ('active','trialing','lifetime');

    if not exists (select 1 from public.subscriptions
                   where store_id = p_store_id and status in ('active','trialing','lifetime')) then
      update public.stores
      set subscription_status = 'canceled', updated_at = v_now
      where id = p_store_id;
    end if;
  end if;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (
    auth.uid(),
    case when p_enabled then 'module_enabled' else 'module_disabled' end,
    jsonb_build_object('store_id', p_store_id, 'module_key', p_module_key,
                       'days', p_days, 'as_trial', p_as_trial)
  );

  return json_build_object('success', true,
    'result', case when p_enabled then 'enabled' else 'disabled' end);
end;
$function$;

-- 2) Conversao trial -> pago: reinicia o periodo e cancela outros trials do mesmo modulo
create or replace function public.subscriptions_trial_convert()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if NEW.status in ('active','lifetime')
     and OLD.status is distinct from NEW.status
     and NEW.module_key is not null then

    if OLD.status = 'trialing'
       and NEW.current_period_end is not distinct from OLD.current_period_end then
      NEW.current_period_start := now();
      NEW.current_period_end := now() + case NEW.billing_cycle
        when 'semiannual' then interval '6 months'
        when 'yearly' then interval '1 year'
        else interval '1 month' end;
    end if;

    update public.subscriptions
    set status = 'canceled', canceled_at = now(), updated_at = now(), is_current = false
    where store_id = NEW.store_id
      and module_key = NEW.module_key
      and status = 'trialing'
      and id <> NEW.id;
  end if;
  return NEW;
end;
$function$;

drop trigger if exists trg_subscriptions_trial_convert on public.subscriptions;
create trigger trg_subscriptions_trial_convert
  before update of status on public.subscriptions
  for each row execute function public.subscriptions_trial_convert();