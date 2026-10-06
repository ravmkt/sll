alter table public.referral_rewards add column if not exists available_at timestamptz;

drop index if exists public.uq_referral_rewards_sub_period;
drop function if exists public.fn_calculate_referral_commission();

create or replace function public.record_referral_commission(
  p_subscription_id uuid,
  p_payment_id text,
  p_value numeric,
  p_period text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_store_id uuid;
  v_referrer_id uuid;
  v_price_cents integer;
  v_rate numeric := 10.00;
begin
  if p_payment_id is null or coalesce(p_value, 0) <= 0 then
    return;
  end if;

  select store_id into v_store_id from public.subscriptions where id = p_subscription_id;
  if v_store_id is null then
    return;
  end if;

  select referred_by_store_id into v_referrer_id from public.stores where id = v_store_id;
  if v_referrer_id is null then
    return;
  end if;

  if exists (select 1 from public.referral_rewards where asaas_payment_id = p_payment_id) then
    return;
  end if;

  v_price_cents := round(p_value * 100)::integer;

  insert into public.referral_rewards (
    referrer_store_id, referred_store_id, subscription_id,
    period_reference, plan_price_cents, amount, commission_rate, status,
    asaas_payment_id, available_at
  ) values (
    v_referrer_id, v_store_id, p_subscription_id,
    p_period, v_price_cents, round((v_price_cents / 100.0) * (v_rate / 100.0), 2), v_rate, 'pending',
    p_payment_id, now() + interval '15 days'
  )
  on conflict do nothing;
end;
$function$;

create or replace function public.cancel_referral_reward_by_payment(p_payment_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.referral_rewards
  set status = 'canceled', updated_at = now()
  where asaas_payment_id = p_payment_id and status <> 'canceled';
end;
$function$;

create or replace function public.fn_cancel_referral_on_subscription_cancel()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if NEW.status = 'canceled' and OLD.status is distinct from 'canceled' then
    update public.referral_rewards
    set status = 'canceled', updated_at = now()
    where subscription_id = NEW.id
      and status = 'pending'
      and created_at >= now() - interval '7 days';
  end if;
  return NEW;
end;
$function$;

drop trigger if exists trg_cancel_referral_on_cancel on public.subscriptions;
create trigger trg_cancel_referral_on_cancel
after update of status on public.subscriptions
for each row execute function public.fn_cancel_referral_on_subscription_cancel();

create or replace function public.release_referral_rewards()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count integer;
begin
  with up as (
    update public.referral_rewards
    set status = 'paid', updated_at = now()
    where status = 'pending' and available_at is not null and available_at <= now()
    returning 1
  )
  select count(*) into v_count from up;
  return v_count;
end;
$function$;

revoke all on function public.record_referral_commission(uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.cancel_referral_reward_by_payment(text) from public, anon, authenticated;
revoke all on function public.release_referral_rewards() from public, anon, authenticated;
grant execute on function public.record_referral_commission(uuid, text, numeric, text) to service_role;
grant execute on function public.cancel_referral_reward_by_payment(text) to service_role;
grant execute on function public.release_referral_rewards() to service_role;

create extension if not exists pg_cron;
select cron.schedule('release-referral-rewards', '0 * * * *', 'select public.release_referral_rewards()');

select tgname from pg_trigger where tgrelid = 'public.subscriptions'::regclass and not tgisinternal;