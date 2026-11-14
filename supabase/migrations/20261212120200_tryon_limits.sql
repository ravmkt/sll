-- 0. Colunas de trial (idempotente)
alter table public.dynamic_plans add column if not exists trial_days integer not null default 0;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;

update public.dynamic_plans
set trial_days = 7,
    limits_config = coalesce(limits_config, '{}'::jsonb) ||
      case plan_tier
        when 'starter' then '{"monthly_generations":100,"max_products":50}'::jsonb
        when 'pro'     then '{"monthly_generations":400,"max_products":300}'::jsonb
        when 'scale'   then '{"monthly_generations":1000,"max_products":-1}'::jsonb
        else '{}'::jsonb
      end
where module_slug = 'tryon';

-- 1. Entitlement (-1 = ilimitado)
create or replace function tryon.entitlement(p_store uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, tryon
as $$
declare
  s record;
  v_period date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_limit int;
  v_override int;
  v_used int;
  v_active boolean;
begin
  select sub.status, sub.trial_ends_at, p.plan_tier, p.limits_config
    into s
  from public.subscriptions sub
  join public.dynamic_plans p on p.id = sub.dynamic_plan_id
  where sub.store_id = p_store and sub.module_key = 'tryon' and sub.is_current
  order by sub.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('active', false, 'reason', 'no_subscription');
  end if;

  v_active := s.status in ('active','lifetime')
              or (s.status = 'trialing' and s.trial_ends_at is not null and s.trial_ends_at > now());

  v_limit := coalesce((s.limits_config->>'monthly_generations')::int, 0);

  select monthly_credit_limit into v_override from tryon.store_limits where store_id = p_store;
  if coalesce(v_override, 0) > 0 then v_limit := v_override; end if;

  select generations into v_used from tryon.usage where store_id = p_store and period = v_period;
  v_used := coalesce(v_used, 0);

  return jsonb_build_object(
    'active', v_active,
    'reason', case when v_active then null
                   when s.status = 'trialing' then 'trial_expired'
                   else 'subscription_inactive' end,
    'status', s.status,
    'tier', s.plan_tier,
    'trial_ends_at', s.trial_ends_at,
    'monthly_limit', v_limit,
    'max_products', coalesce((s.limits_config->>'max_products')::int, -1),
    'used', v_used,
    'remaining', case when v_limit < 0 then -1 else greatest(v_limit - v_used, 0) end
  );
end;
$$;

-- 2. Reserva atômica de geração (chamar ANTES do provedor de IA)
create or replace function tryon.reserve_generation(p_store uuid, p_session text)
returns jsonb
language plpgsql
security definer
set search_path = public, tryon
as $$
declare
  e jsonb;
  v_period date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_visitor_max int;
  v_visitor_used int;
begin
  perform pg_advisory_xact_lock(hashtext('tryon:' || p_store::text));

  e := tryon.entitlement(p_store);
  if not coalesce((e->>'active')::boolean, false) then
    return jsonb_build_object('allowed', false, 'reason', coalesce(e->>'reason', 'subscription_inactive'));
  end if;

  if (e->>'monthly_limit')::int >= 0 and (e->>'used')::int >= (e->>'monthly_limit')::int then
    return jsonb_build_object('allowed', false, 'reason', 'monthly_limit_reached');
  end if;

  select max_generations_per_visitor into v_visitor_max from tryon.store_limits where store_id = p_store;
  if coalesce(v_visitor_max, 0) > 0 and p_session is not null then
    select count(*) into v_visitor_used
    from tryon.results r
    join tryon.user_photos u on u.id = r.photo_id
    where r.store_id = p_store
      and u.session_id = p_session
      and r.status <> 'failed'
      and r.created_at >= v_period::timestamptz;
    if v_visitor_used >= v_visitor_max then
      return jsonb_build_object('allowed', false, 'reason', 'visitor_limit_reached');
    end if;
  end if;

  update tryon.usage set generations = generations + 1
  where store_id = p_store and period = v_period;
  if not found then
    insert into tryon.usage (store_id, period, generations, cost_usd) values (p_store, v_period, 1, 0);
  end if;

  return jsonb_build_object('allowed', true, 'reason', null);
end;
$$;

-- 3. Estorno (falha do provedor) e custo (sucesso)
create or replace function tryon.release_generation(p_store uuid)
returns void
language sql
security definer
set search_path = public, tryon
as $$
  update tryon.usage set generations = greatest(generations - 1, 0)
  where store_id = p_store
    and period = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
$$;

create or replace function tryon.add_cost(p_store uuid, p_cost numeric)
returns void
language sql
security definer
set search_path = public, tryon
as $$
  update tryon.usage set cost_usd = cost_usd + p_cost
  where store_id = p_store
    and period = date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
$$;

-- 4. Limite de produtos
create or replace function tryon.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public, tryon
as $$
declare
  v_max int;
  v_count int;
begin
  if exists (select 1 from tryon.products where store_id = new.store_id and external_id = new.external_id) then
    return new;
  end if;
  v_max := coalesce((tryon.entitlement(new.store_id)->>'max_products')::int, -1);
  if v_max >= 0 then
    select count(*) into v_count from tryon.products where store_id = new.store_id;
    if v_count >= v_max then
      raise exception 'product_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tryon_product_limit on tryon.products;
create trigger trg_tryon_product_limit
before insert on tryon.products
for each row execute function tryon.enforce_product_limit();

-- 5. Permissões: apenas service_role
revoke all on function tryon.entitlement(uuid) from public, anon, authenticated;
revoke all on function tryon.reserve_generation(uuid, text) from public, anon, authenticated;
revoke all on function tryon.release_generation(uuid) from public, anon, authenticated;
revoke all on function tryon.add_cost(uuid, numeric) from public, anon, authenticated;
grant execute on function tryon.entitlement(uuid) to service_role;
grant execute on function tryon.reserve_generation(uuid, text) to service_role;
grant execute on function tryon.release_generation(uuid) to service_role;
grant execute on function tryon.add_cost(uuid, numeric) to service_role;
