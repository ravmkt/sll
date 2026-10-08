-- Combos: criar e definir módulos (somente superadmin)
create or replace function public.admin_set_combo_modules(p_plan_id uuid, p_modules jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb;
  v_slug text;
  v_tier text;
  v_seen text[] := '{}';
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.dynamic_plans where id = p_plan_id and is_combo) then
    raise exception 'Combo não encontrado.';
  end if;
  if p_modules is null or jsonb_typeof(p_modules) <> 'array' or jsonb_array_length(p_modules) < 2 then
    raise exception 'Selecione ao menos 2 módulos para o combo.';
  end if;

  delete from public.combo_modules where plan_id = p_plan_id;

  for m in select * from jsonb_array_elements(p_modules) loop
    v_slug := m->>'module_slug';
    v_tier := nullif(trim(coalesce(m->>'member_tier', '')), '');
    if v_slug is null or not exists (select 1 from public.hub_modules where slug = v_slug) then
      raise exception 'Módulo inválido: %', coalesce(v_slug, '(vazio)');
    end if;
    if v_slug = any(v_seen) then
      raise exception 'Módulo repetido no combo: %', v_slug;
    end if;
    if v_tier is not null and not exists (
      select 1 from public.dynamic_plans
      where module_slug = v_slug and plan_tier = v_tier and not is_combo
    ) then
      raise exception 'O módulo % não possui o plano "%".', v_slug, v_tier;
    end if;
    insert into public.combo_modules (plan_id, module_slug, member_tier)
    values (p_plan_id, v_slug, v_tier);
    v_seen := v_seen || v_slug;
  end loop;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'combo_modules_set', jsonb_build_object('plan_id', p_plan_id, 'modules', p_modules));
end;
$$;

create or replace function public.admin_create_combo(p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_tier text := lower(trim(coalesce(p_data->>'plan_tier', '')));
  v_name text := trim(coalesce(p_data->>'plan_name', ''));
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if v_name = '' then
    raise exception 'Informe o nome do combo.';
  end if;
  if v_tier = '' then
    raise exception 'Informe a chave do combo (ex.: master).';
  end if;
  if exists (select 1 from public.dynamic_plans where lower(plan_name) = lower(v_name)) then
    raise exception 'Já existe um plano com o nome "%".', v_name;
  end if;
  if exists (select 1 from public.dynamic_plans where is_combo and plan_tier = v_tier) then
    raise exception 'Já existe um combo com a chave "%".', v_tier;
  end if;

  insert into public.dynamic_plans (
    module_slug, plan_tier, plan_name, is_combo,
    price_monthly_cents, price_semiannual_cents, price_annual_cents,
    limits_config, is_recommended, sort_order, is_active
  ) values (
    null, v_tier, v_name, true,
    coalesce((p_data->>'price_monthly_cents')::int, 0),
    coalesce((p_data->>'price_semiannual_cents')::int, 0),
    coalesce((p_data->>'price_annual_cents')::int, 0),
    coalesce(p_data->'limits_config', '{}'::jsonb),
    coalesce((p_data->>'is_recommended')::boolean, false),
    (select coalesce(max(sort_order), 0) + 1 from public.dynamic_plans where is_combo),
    coalesce((p_data->>'is_active')::boolean, false)
  ) returning id into v_id;

  perform public.admin_set_combo_modules(v_id, p_data->'modules');

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'combo_created', jsonb_build_object('plan_id', v_id, 'tier', v_tier, 'name', v_name));

  return v_id;
end;
$$;

revoke all on function public.admin_set_combo_modules(uuid, jsonb) from public, anon;
revoke all on function public.admin_create_combo(jsonb) from public, anon;
grant execute on function public.admin_set_combo_modules(uuid, jsonb) to authenticated;
grant execute on function public.admin_create_combo(jsonb) to authenticated;