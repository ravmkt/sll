create or replace function public.admin_plan_subscribers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_object_agg(t.pid, t.n)
    from (
      select dynamic_plan_id::text as pid, count(distinct store_id)::int as n
      from public.subscriptions
      where is_current = true
        and dynamic_plan_id is not null
        and status in ('active', 'trialing', 'lifetime', 'past_due')
      group by dynamic_plan_id
    ) t
  ), '{}'::jsonb);
end;
$$;

create or replace function public.admin_create_dynamic_plan(p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text := p_data->>'module_slug';
  v_tier text := lower(trim(coalesce(p_data->>'plan_tier', '')));
  v_name text := trim(coalesce(p_data->>'plan_name', ''));
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.hub_modules where slug = v_slug) then
    raise exception 'Módulo inválido.';
  end if;
  if v_tier = '' then
    raise exception 'Informe a chave do plano (ex.: starter).';
  end if;
  if v_name = '' then
    raise exception 'Informe o nome do plano.';
  end if;
  if exists (select 1 from public.dynamic_plans where module_slug = v_slug and plan_tier = v_tier) then
    raise exception 'Já existe um plano "%" neste módulo.', v_tier;
  end if;

  insert into public.dynamic_plans (
    module_slug, plan_tier, plan_name, is_combo,
    price_monthly_cents, price_semiannual_cents, price_annual_cents,
    limits_config, is_recommended, sort_order, is_active
  ) values (
    v_slug, v_tier, v_name, false,
    coalesce((p_data->>'price_monthly_cents')::int, 0),
    coalesce((p_data->>'price_semiannual_cents')::int, 0),
    coalesce((p_data->>'price_annual_cents')::int, 0),
    coalesce(p_data->'limits_config', '{}'::jsonb),
    coalesce((p_data->>'is_recommended')::boolean, false),
    (select coalesce(max(sort_order), 0) + 1 from public.dynamic_plans where module_slug = v_slug),
    coalesce((p_data->>'is_active')::boolean, false)
  ) returning id into v_id;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'plan_created', jsonb_build_object('plan_id', v_id, 'module_key', v_slug, 'tier', v_tier, 'name', v_name));

  return v_id;
end;
$$;

revoke all on function public.admin_plan_subscribers() from public, anon;
revoke all on function public.admin_create_dynamic_plan(jsonb) from public, anon;
grant execute on function public.admin_plan_subscribers() to authenticated;
grant execute on function public.admin_create_dynamic_plan(jsonb) to authenticated;