-- Cadastro: prazo do trial vem do Master (get_trial_days), sem "7 days" fixo
create or replace function public.create_or_get_user_tenant(
  p_user_id uuid, p_user_name text, p_user_email text, p_store_name text,
  p_referral_code text default null, p_module text default 'vidlytics')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_store_id uuid;
  v_referred_by uuid;
  v_module text := coalesce(nullif(trim(p_module), ''), 'vidlytics');
  v_dp uuid;
  v_days int := coalesce(nullif(public.get_trial_days()::int, 0), 14);
  v_end timestamptz := now() + make_interval(days => coalesce(nullif(public.get_trial_days()::int, 0), 14));
begin
  select id into v_store_id from public.stores where owner_user_id = p_user_id order by created_at desc limit 1;
  if v_store_id is not null then
    return jsonb_build_object('store_id', v_store_id, 'is_new', false);
  end if;

  if v_module not in ('vidlytics', 'live_commerce') then
    v_module := 'vidlytics';
  end if;

  if p_referral_code is not null then
    select id into v_referred_by from public.stores where referral_code = upper(trim(p_referral_code));
  end if;

  insert into public.stores (name, owner_user_id, referred_by_store_id, subscription_status, trial_ends_at, active)
  values (p_store_name, p_user_id, v_referred_by, 'trialing', v_end, true)
  returning id into v_store_id;

  insert into public.store_members (store_id, user_id, role) values (v_store_id, p_user_id, 'owner');

  insert into public.store_settings (store_id, store_name, contact_email, app_enabled, stories_enabled, carousel_enabled, floating_widget_enabled, widget_enabled)
  values (v_store_id, p_store_name, p_user_email, true, true, true, true, true);

  insert into public.usage_counters (store_id, month, videos_count, views_count, users_count)
  values (v_store_id, to_char(now(), 'YYYY-MM'), 0, 0, 1);

  select id into v_dp from public.dynamic_plans
  where module_slug = v_module and plan_tier = 'scale' and is_active = true
  limit 1;

  insert into public.subscriptions (
    store_id, dynamic_plan_id, status, billing_cycle, current_period_start, current_period_end,
    is_current, billing_provider, payment_method, module_key
  ) values (
    v_store_id, v_dp, 'trialing', 'monthly', now(), v_end,
    true, 'manual_admin', null, v_module
  );

  return jsonb_build_object('store_id', v_store_id, 'is_new', true, 'module', v_module, 'trial_days', v_days);
end;
$function$;