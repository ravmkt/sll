create or replace function public.admin_master_store_referrals(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_by jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select jsonb_build_object('id', r.id, 'name', r.name) into v_by
  from public.stores s join public.stores r on r.id = s.referred_by_store_id where s.id = p_store_id;

  return jsonb_build_object('referred_by', v_by, 'list', coalesce((
    select jsonb_agg(t.x order by t.x->>'created_at' desc) from (
      select jsonb_build_object(
        'id', c.id, 'name', c.name, 'created_at', c.created_at,
        'plan_name', (select to_jsonb(pl)->>'name' from public.subscriptions sb join public.dynamic_plans pl on pl.id = sb.plan_id
                      where sb.store_id = c.id and sb.is_current order by sb.created_at desc limit 1),
        'status', (select case when bool_or(sb.status = 'past_due') then 'past_due'
                               when bool_or(sb.status in ('active','lifetime')) then 'active'
                               when bool_or(sb.status = 'trialing') then 'trial' else 'inactive' end
                   from public.subscriptions sb where sb.store_id = c.id and sb.is_current),
        'commission', (select coalesce(sum(coalesce((to_jsonb(rw)->>'amount_cents')::numeric / 100, (to_jsonb(rw)->>'amount')::numeric, 0)), 0)
                       from public.referral_rewards rw
                       where to_jsonb(rw)->>'referred_store_id' = c.id::text
                         and rw.status <> 'canceled')
      ) x
      from public.stores c where c.referred_by_store_id = p_store_id
    ) t), '[]'::jsonb));
end $$;
grant execute on function public.admin_master_store_referrals(uuid) to authenticated;
