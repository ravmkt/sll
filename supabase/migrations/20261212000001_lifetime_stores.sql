alter table public.stores add column if not exists is_lifetime boolean not null default false;

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
    ) sub
    where m is not null;
  end if;

  if v_modules ? 'live_commerce' and not (v_modules ? 'stream_sell') then
    v_modules := v_modules || '["stream_sell"]'::jsonb;
  end if;

  return v_modules;
end;
$function$;

update public.stores
set is_lifetime = true,
    max_gates = 999999,
    max_custom_domains = 999999,
    storage_limit_bytes = 10995116277760,
    updated_at = now()
where id = '955ce943-52b4-4876-802c-e4afe5e9c4c8';

select public.get_store_active_modules('955ce943-52b4-4876-802c-e4afe5e9c4c8');
