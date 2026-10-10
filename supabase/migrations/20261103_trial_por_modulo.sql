-- Trial por modulo: assinatura trialing (Scale, 7 dias) no modulo escolhido no cadastro

-- 1) Acesso respeita o fim do trial
create or replace function public._sub_has_access(p_status text, p_since timestamptz, p_end timestamptz)
returns boolean
language sql
stable
as $$
  select p_status in ('active', 'lifetime')
      or (p_status = 'trialing' and p_end is not null and p_end > now())
      or (p_status = 'past_due'
          and coalesce(p_since, now()) > now() - make_interval(days => public.billing_grace_days()));
$$;

-- 2) Modulos ativos: sem o 'vidlytics' fixo do trial da loja
create or replace function public.get_store_active_modules(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_modules jsonb := '[]'::jsonb;
  v_store record;
begin
  select id, active into v_store from public.stores where id = p_store_id;
  if not found or v_store.active = false then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(distinct m), '[]'::jsonb) into v_modules
  from (
    select jsonb_array_elements_text(p.modules) as m
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.store_id = p_store_id
      and public._sub_has_access(s.status, s.past_due_since, s.current_period_end)
    union
    select s.module_key
    from public.subscriptions s
    where s.store_id = p_store_id
      and public._sub_has_access(s.status, s.past_due_since, s.current_period_end)
      and s.module_key is not null
      and s.module_key <> 'bundle'
    union
    select cm.module_slug
    from public.subscriptions s
    join public.combo_modules cm on cm.plan_id = s.dynamic_plan_id
    where s.store_id = p_store_id
      and public._sub_has_access(s.status, s.past_due_since, s.current_period_end)
  ) sub
  where m is not null;

  return v_modules;
end;
$function$;

grant execute on function public.get_store_active_modules(uuid) to authenticated;

-- 3) Status da loja: trialing vencido nao conta
create or replace function public._calc_store_status(p_store_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s record;
  pd boolean; ac boolean; tr boolean;
begin
  select subscription_status, trial_ends_at into s from public.stores where id = p_store_id;
  if not found then return null; end if;

  select coalesce(bool_or(status = 'past_due'), false),
         coalesce(bool_or(status in ('active', 'lifetime')), false),
         coalesce(bool_or(status = 'trialing' and current_period_end > now()), false)
    into pd, ac, tr
  from public.subscriptions
  where store_id = p_store_id and is_current = true;

  if pd then return 'past_due'; end if;
  if ac then return 'active'; end if;
  if tr then return 'trialing'; end if;
  if s.subscription_status = 'trialing' and s.trial_ends_at > now() then return 'trialing'; end if;
  return 'canceled';
end;
$$;

create or replace function public.expire_trials()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare r record; n int := 0;
begin
  for r in select id from public.stores where subscription_status = 'trialing'
  loop
    perform public.recompute_store_status(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public._calc_store_status(uuid) from public, anon, authenticated;
revoke all on function public.expire_trials() from public, anon, authenticated;

-- 4) Cadastro: cria o trial do modulo escolhido
drop function if exists public.create_or_get_user_tenant(uuid, text, text, text, text);

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
  v_end timestamptz := now() + interval '7 days';
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

  return jsonb_build_object('store_id', v_store_id, 'is_new', true, 'module', v_module);
end;
$function$;

-- 5) Lojas em trial sem assinatura ganham o trial do Vidlytics
insert into public.subscriptions (
  store_id, dynamic_plan_id, status, billing_cycle, current_period_start, current_period_end,
  is_current, billing_provider, payment_method, module_key
)
select st.id,
       (select id from public.dynamic_plans where module_slug = 'vidlytics' and plan_tier = 'scale' and is_active = true limit 1),
       'trialing', 'monthly', now(), st.trial_ends_at, true, 'manual_admin', null, 'vidlytics'
from public.stores st
where st.subscription_status = 'trialing'
  and st.trial_ends_at > now()
  and not exists (select 1 from public.subscriptions x where x.store_id = st.id);
