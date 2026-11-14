-- 1) Registro do módulo
insert into public.hub_modules (slug, name, status, route_path, description, benefits, sort_order)
values (
  'widgets', 'Widgets', 'active', '/widgets',
  'Elementos de conversão para a sua loja, como a régua de descontos.',
  '["Régua de descontos informativa","Posicionamento visual na loja","Estilos personalizáveis"]'::jsonb,
  coalesce((select max(sort_order) from public.hub_modules), 0) + 1
)
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      route_path = excluded.route_path,
      description = excluded.description,
      benefits = excluded.benefits;

-- 2) get_store_active_modules: 'widgets' liberado para toda loja ativa (beta)
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
  select id, active, is_lifetime into v_store from public.stores where id = p_store_id;
  if not found or v_store.active = false then
    return '[]'::jsonb;
  end if;

  if coalesce(v_store.is_lifetime, false) then
    select coalesce(jsonb_agg(distinct m), '[]'::jsonb) into v_modules
    from (
      select slug as m from public.hub_modules
      union select module_slug from public.dynamic_plans where module_slug is not null
      union select 'gate'
    ) x where m is not null;
  else
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
      union
      select 'widgets'
    ) sub
    where m is not null;
  end if;

  return v_modules;
end;
$function$;
