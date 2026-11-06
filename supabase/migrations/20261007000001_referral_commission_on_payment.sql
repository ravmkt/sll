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
    period_reference, plan_price_cents, amount, commission_rate, status, asaas_payment_id
  ) values (
    v_referrer_id, v_store_id, p_subscription_id,
    p_period, v_price_cents, round((v_price_cents / 100.0) * (v_rate / 100.0), 2), v_rate, 'paid', p_payment_id
  )
  on conflict do nothing;
end;
$function$;

revoke all on function public.record_referral_commission(uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.record_referral_commission(uuid, text, numeric, text) to service_role;

-- A comissao agora nasce do pagamento confirmado (webhook), nao da mudanca de status
drop trigger if exists trg_calculate_referral_commission on public.subscriptions;

select tgname from pg_trigger where tgrelid = 'public.subscriptions'::regclass and not tgisinternal;