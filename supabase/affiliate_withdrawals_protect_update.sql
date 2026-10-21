begin;

create or replace function public.trg_protect_withdrawal_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is null or auth.role() = 'service_role' or public.is_superadmin() then
    return new;
  end if;

  raise exception 'Saque não pode ser alterado pelo lojista'
    using errcode = '42501';
end;
$$;

revoke all on function public.trg_protect_withdrawal_update() from public, anon, authenticated;

drop trigger if exists protect_withdrawal_update on public.affiliate_withdrawals;
create trigger protect_withdrawal_update
  before update on public.affiliate_withdrawals
  for each row execute function public.trg_protect_withdrawal_update();

commit;
