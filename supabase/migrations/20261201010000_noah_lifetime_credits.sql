create or replace function public.noah_plan_credits(p_store_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare r record; best int := 0; v int;
begin
  for r in
    select s.status, s.dynamic_plan_id
    from public.subscriptions s
    where s.store_id = p_store_id
      and coalesce(s.is_current, true)
      and s.status in ('active', 'trial', 'trialing', 'lifetime')
  loop
    if r.status in ('trial', 'trialing', 'lifetime') then
      v := 1000;
    else
      select coalesce(
               nullif(dp.limits_config->>'ai_messages', '')::int,
               case
                 when dp.is_combo then 1000
                 when lower(coalesce(dp.plan_tier, '') || ' ' || coalesce(dp.plan_name, '')) like '%scale%' then 1000
                 when lower(coalesce(dp.plan_tier, '') || ' ' || coalesce(dp.plan_name, '')) like '%pro%' then 250
                 else 50
               end)
        into v
        from public.dynamic_plans dp
       where dp.id = r.dynamic_plan_id;
      v := coalesce(v, 50);
    end if;
    best := greatest(best, v);
  end loop;
  return best;
end $function$;

revoke all on function public.noah_plan_credits(uuid) from public, anon, authenticated;
grant execute on function public.noah_plan_credits(uuid) to service_role;
