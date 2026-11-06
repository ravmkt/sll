-- Cancelar assinatura cancela qualquer comissão ainda em carência (pending)
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
      and status = 'pending';
  end if;
  return NEW;
end;
$function$;