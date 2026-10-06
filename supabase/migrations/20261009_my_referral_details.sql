create or replace function public.get_my_referral_details()
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_store_id uuid;
begin
  select id into v_store_id
  from public.stores
  where owner_user_id = auth.uid()
  order by created_at asc
  limit 1;

  if v_store_id is null then
    return '[]'::json;
  end if;

  return coalesce((
    select json_agg(x order by x.joined_at desc)
    from (
      select
        s.id as store_id,
        s.name as store_name,
        s.created_at as joined_at,
        s.trial_ends_at,
        sub.canceled_at,
        case
          when coalesce(sub.status, '') = 'canceled' or s.subscription_status = 'canceled' then 'canceled'
          when r.pending_amount > 0 or r.paid_amount > 0 then 'paid'
          when coalesce(sub.status, '') = 'past_due' or s.subscription_status = 'past_due' then 'past_due'
          when s.subscription_status = 'trialing' and s.trial_ends_at > now() then 'trial'
          when s.subscription_status = 'trialing' then 'trial_expired'
          else 'other'
        end as status,
        r.pending_amount as commission_pending,
        r.paid_amount as commission_released,
        r.canceled_amount as commission_canceled,
        r.next_release_at
      from public.stores s
      left join lateral (
        select status, canceled_at
        from public.subscriptions
        where store_id = s.id and is_current = true
        order by created_at desc
        limit 1
      ) sub on true
      left join lateral (
        select
          coalesce(sum(amount) filter (where status = 'pending'), 0) as pending_amount,
          coalesce(sum(amount) filter (where status = 'paid'), 0) as paid_amount,
          coalesce(sum(amount) filter (where status = 'canceled'), 0) as canceled_amount,
          min(available_at) filter (where status = 'pending') as next_release_at
        from public.referral_rewards
        where referred_store_id = s.id and referrer_store_id = v_store_id
      ) r on true
      where s.referred_by_store_id = v_store_id
    ) x
  ), '[]'::json);
end;
$function$;

revoke all on function public.get_my_referral_details() from public, anon;
grant execute on function public.get_my_referral_details() to authenticated;

select public.get_my_referral_details();