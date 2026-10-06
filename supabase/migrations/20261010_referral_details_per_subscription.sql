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
    select json_agg(y order by y.joined_at desc, y.product_name nulls last)
    from (
      select
        x.*,
        case x.product_key
          when 'vidlytics' then 'Vidlytics'
          when 'live_commerce' then 'Live Commerce'
          when 'bundle' then 'Pacote'
          when null then null
          else initcap(replace(x.product_key, '_', ' '))
        end as product_name
      from (
        select
          s.id as store_id,
          s.name as store_name,
          s.created_at as joined_at,
          s.trial_ends_at,
          sub.id as subscription_id,
          sub.canceled_at,
          p.name as plan_name,
          coalesce(
            nullif(nullif(sub.module_key, 'bundle'), ''),
            case when jsonb_array_length(to_jsonb(p.modules)) = 1 then to_jsonb(p.modules) ->> 0 end,
            case when sub.id is not null then 'bundle' end
          ) as product_key,
          case
            when coalesce(sub.status, '') = 'canceled' or (sub.id is null and s.subscription_status = 'canceled') then 'canceled'
            when r.pending_amount > 0 or r.paid_amount > 0 then 'paid'
            when coalesce(sub.status, '') = 'past_due' or (sub.id is null and s.subscription_status = 'past_due') then 'past_due'
            when s.subscription_status = 'trialing' and s.trial_ends_at > now() then 'trial'
            when s.subscription_status = 'trialing' then 'trial_expired'
            else 'other'
          end as status,
          r.pending_amount as commission_pending,
          r.paid_amount as commission_released,
          r.canceled_amount as commission_canceled,
          r.next_release_at
        from public.stores s
        left join public.subscriptions sub
          on sub.store_id = s.id and sub.is_current = true
        left join public.plans p
          on p.id = sub.plan_id
        left join lateral (
          select
            coalesce(sum(rr.amount) filter (where rr.status = 'pending'), 0) as pending_amount,
            coalesce(sum(rr.amount) filter (where rr.status = 'paid'), 0) as paid_amount,
            coalesce(sum(rr.amount) filter (where rr.status = 'canceled'), 0) as canceled_amount,
            min(rr.available_at) filter (where rr.status = 'pending') as next_release_at
          from public.referral_rewards rr
          where rr.referred_store_id = s.id
            and rr.referrer_store_id = v_store_id
            and (sub.id is null or rr.subscription_id = sub.id)
        ) r on true
        where s.referred_by_store_id = v_store_id
      ) x
    ) y
  ), '[]'::json);
end;
$function$;

revoke all on function public.get_my_referral_details() from public, anon;
grant execute on function public.get_my_referral_details() to authenticated;