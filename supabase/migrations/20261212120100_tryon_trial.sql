-- Um único registro atual do Try-On por loja
create unique index if not exists uq_subscriptions_tryon_current
  on public.subscriptions (store_id)
  where module_key = 'tryon' and is_current;

create or replace function tryon.start_trial(p_store uuid, p_user uuid, p_tier text default 'starter')
returns jsonb
language plpgsql
security definer
set search_path = public, tryon
as $$
declare
  v_plan public.dynamic_plans%rowtype;
begin
  if not exists (select 1 from public.stores where id = p_store and owner_user_id = p_user) then
    raise exception 'store_not_owned';
  end if;

  -- Trial só uma vez por loja/módulo
  if exists (select 1 from public.subscriptions where store_id = p_store and module_key = 'tryon') then
    return tryon.entitlement(p_store);
  end if;

  select * into v_plan from public.dynamic_plans
  where module_slug = 'tryon' and plan_tier = p_tier and is_active
  limit 1;

  if not found then
    raise exception 'plan_not_found';
  end if;

  insert into public.subscriptions
    (store_id, module_key, dynamic_plan_id, status, billing_cycle, is_current, trial_ends_at)
  values
    (p_store, 'tryon', v_plan.id, 'trialing', 'monthly', true,
     now() + make_interval(days => v_plan.trial_days));

  return tryon.entitlement(p_store);
end;
$$;

revoke all on function tryon.start_trial(uuid, uuid, text) from public, anon, authenticated;
grant execute on function tryon.start_trial(uuid, uuid, text) to service_role;
