begin;

create or replace function public.trg_check_withdrawal_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('aff_wd:' || new.store_id::text));

  select s.available_balance
    into v_balance
  from public.affiliate_dashboard_summary s
  where s.store_id = new.store_id
  limit 1;

  if coalesce(v_balance, 0) < new.amount then
    raise exception 'Saldo insuficiente para este saque'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.trg_check_withdrawal_balance() from public, anon, authenticated;

drop trigger if exists check_withdrawal_balance on public.affiliate_withdrawals;
create trigger check_withdrawal_balance
  before insert on public.affiliate_withdrawals
  for each row execute function public.trg_check_withdrawal_balance();

commit;
