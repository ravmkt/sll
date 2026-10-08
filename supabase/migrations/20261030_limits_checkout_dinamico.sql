-- Calculo interno (sem checagem de auth: usado por triggers). Nao exposto.
create or replace function public._module_limits(p_store_id uuid, p_module text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
  a record;
  g record;
  v jsonb;
  best jsonb := null;
begin
  for r in
    select s.id, s.module_key, s.dynamic_plan_id, s.plan_id
    from public.subscriptions s
    where s.store_id = p_store_id
      and s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
    order by (s.dynamic_plan_id is not null) desc, s.created_at desc
  loop
    v := null;
    if r.dynamic_plan_id is not null then
      select case
               when dp.is_combo then (
                 select pl.limits_config || coalesce(cm.limits_override, '{}'::jsonb)
                 from public.combo_modules cm
                 cross join lateral (
                   select x.limits_config from public.dynamic_plans x
                   where x.module_slug = cm.module_slug and not x.is_combo
                     and (cm.member_tier is null or x.plan_tier = cm.member_tier)
                   order by x.is_active desc, x.price_monthly_cents desc
                   limit 1
                 ) pl
                 where cm.plan_id = dp.id and cm.module_slug = p_module)
               when dp.module_slug = p_module then dp.limits_config
             end
        into v
      from public.dynamic_plans dp
      where dp.id = r.dynamic_plan_id;
    elsif r.plan_id is not null then
      -- Legado: 0 significa "nao definido" e vira ilimitado
      select jsonb_build_object(
               'views', nullif(p.views_limit, 0),
               'max_videos', nullif(p.videos_limit, 0),
               'max_pages', nullif(p.pages_limit, 0),
               'storage_gb', case when coalesce(p.storage_limit_bytes, 0) = 0 then null
                                  else round(p.storage_limit_bytes / 1073741824.0, 2) end)
        into v
      from public.plans p
      where p.id = r.plan_id
        and (r.module_key = p_module
             or (coalesce(r.module_key, 'bundle') = 'bundle' and to_jsonb(p.modules) ? p_module));
    end if;

    if v is not null and best is null then best := v; end if;
  end loop;

  if best is null then return null; end if;

  for a in
    select ad.grants, sa.quantity
    from public.subscription_addons sa
    join public.plan_addons ad on ad.id = sa.addon_id
    join public.subscriptions s on s.id = sa.subscription_id
    where s.store_id = p_store_id
      and s.is_current = true
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
      and ad.module_slug = p_module
  loop
    for g in select key, value from jsonb_each_text(a.grants) loop
      if best ? g.key and jsonb_typeof(best -> g.key) = 'null' then continue; end if;
      best := best || jsonb_build_object(g.key, coalesce((best ->> g.key)::numeric, 0) + g.value::numeric * a.quantity);
    end loop;
  end loop;

  return best;
end;
$$;

create or replace function public.get_module_limits(p_store_id uuid, p_module text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_superadmin() or public.is_store_owner_or_member(p_store_id)) then
    return null;
  end if;
  return public._module_limits(p_store_id, p_module);
end;
$$;

create or replace function public.get_effective_limits(p_store_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.get_module_limits(p_store_id, 'vidlytics');
$$;

-- Grava o limite de storage na loja a partir do plano/combo/add-ons
create or replace function public.sync_store_limits(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l jsonb;
  bytes bigint;
begin
  l := public._module_limits(p_store_id, 'vidlytics');
  if l is null or jsonb_typeof(l -> 'storage_gb') <> 'number' then return; end if;
  bytes := round((l ->> 'storage_gb')::numeric * 1073741824)::bigint;
  update public.stores
     set storage_limit_bytes = bytes, updated_at = now()
   where id = p_store_id and storage_limit_bytes is distinct from bytes;
end;
$$;

create or replace function public.trg_sync_limits_from_sub()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_store_limits(coalesce(new.store_id, old.store_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_sync_limits_from_addon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_store uuid;
begin
  select store_id into v_store from public.subscriptions
   where id = coalesce(new.subscription_id, old.subscription_id);
  if v_store is not null then perform public.sync_store_limits(v_store); end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sub_limits on public.subscriptions;
create trigger trg_sub_limits
  after insert or update of status, is_current, dynamic_plan_id, plan_id
  on public.subscriptions
  for each row execute function public.trg_sync_limits_from_sub();

drop trigger if exists trg_addon_limits on public.subscription_addons;
create trigger trg_addon_limits
  after insert or update or delete on public.subscription_addons
  for each row execute function public.trg_sync_limits_from_addon();

-- Modulos liberados: inclui combos dinamicos; Vidlytics automatico so durante o trial
create or replace function public.get_store_active_modules(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modules jsonb := '[]'::jsonb;
  v_store record;
begin
  select id, subscription_status, trial_ends_at, active
  into v_store
  from public.stores
  where id = p_store_id;

  if not found or v_store.active = false then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(distinct m), '[]'::jsonb) into v_modules
  from (
    select jsonb_array_elements_text(p.modules) as m
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.store_id = p_store_id
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
    union
    select s.module_key
    from public.subscriptions s
    where s.store_id = p_store_id
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
      and s.module_key is not null
      and s.module_key <> 'bundle'
    union
    select cm.module_slug
    from public.subscriptions s
    join public.combo_modules cm on cm.plan_id = s.dynamic_plan_id
    where s.store_id = p_store_id
      and s.status in ('active', 'trialing', 'lifetime', 'past_due')
    union
    select 'vidlytics'
    where v_store.subscription_status = 'trialing' and v_store.trial_ends_at > now()
  ) sub
  where m is not null;

  return v_modules;
end;
$$;

revoke all on function public._module_limits(uuid, text) from public, anon, authenticated;
revoke all on function public.sync_store_limits(uuid) from public, anon, authenticated;
revoke all on function public.get_module_limits(uuid, text) from public, anon;
grant execute on function public.get_module_limits(uuid, text) to authenticated;

-- Aplica os limites nas lojas atuais
select public.sync_store_limits(id) from public.stores;

-- Conferencia (loja 47ad: Vidlytics legado, esperado max_videos = 10 e demais ilimitados)
select public._module_limits('47ad9ac3-71e7-4f6b-8d26-2a0d6a6552b6', 'vidlytics') as limites,
       public.get_store_active_modules('47ad9ac3-71e7-4f6b-8d26-2a0d6a6552b6') as modulos;