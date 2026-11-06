alter table public.subscriptions
  add column if not exists one_time_pending_cents integer not null default 0,
  add column if not exists recurring_value_cents integer,
  add column if not exists recurring_description text;

drop function if exists public.settle_one_time_charge(text);
create or replace function public.settle_one_time_charge(p_asaas_subscription_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  update public.subscriptions
     set one_time_pending_cents = 0, updated_at = now()
   where asaas_subscription_id = p_asaas_subscription_id
     and one_time_pending_cents > 0
     and recurring_value_cents is not null
  returning jsonb_build_object('recurring_cents', recurring_value_cents, 'description', recurring_description) into v;
  return v;
end;
$$;
revoke all on function public.settle_one_time_charge(text) from public, anon, authenticated;
grant execute on function public.settle_one_time_charge(text) to service_role;

select count(*) as subs_com_avulso_pendente from public.subscriptions where one_time_pending_cents > 0;