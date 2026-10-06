CREATE OR REPLACE FUNCTION public.fn_calculate_referral_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_price_cents integer;
  v_commission_rate numeric;
  v_amount numeric;
  v_period text;
BEGIN
  SELECT referred_by_store_id INTO v_referrer_id
  FROM public.stores
  WHERE id = NEW.store_id;

  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT price_cents INTO v_price_cents
  FROM public.plans
  WHERE id = NEW.plan_id;

  IF v_price_cents IS NULL THEN
    RETURN NEW;
  END IF;

  v_commission_rate := 10.00;
  v_amount := ROUND((v_price_cents / 100.0) * (v_commission_rate / 100.0), 2);
  v_period := to_char(now(), 'YYYY-MM');

  INSERT INTO public.referral_rewards (
    referrer_store_id, referred_store_id, subscription_id,
    period_reference, plan_price_cents, amount, commission_rate, status
  ) VALUES (
    v_referrer_id, NEW.store_id, NEW.id,
    v_period, v_price_cents, v_amount, v_commission_rate, 'paid'
  )
  ON CONFLICT (subscription_id, period_reference) WHERE subscription_id IS NOT NULL
  DO UPDATE SET
    amount = EXCLUDED.amount,
    plan_price_cents = EXCLUDED.plan_price_cents,
    commission_rate = EXCLUDED.commission_rate,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Teste: ativa/atualiza uma assinatura de loja indicada e confere a recompensa
-- select * from public.referral_rewards where subscription_id is not null order by created_at desc;

-- Opcional: apagar as 2 recompensas de teste (subscription_id nulo)
-- delete from public.referral_rewards where subscription_id is null and asaas_payment_id is null;