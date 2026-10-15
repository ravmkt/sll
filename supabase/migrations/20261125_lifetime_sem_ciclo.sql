begin;

create or replace function public.subscriptions_lifetime_sem_ciclo()
returns trigger language plpgsql as $$
begin
  if new.status = 'lifetime' then
    new.billing_cycle := null;
  end if;
  return new;
end $$;

drop trigger if exists zz_subscriptions_lifetime_sem_ciclo on public.subscriptions;
create trigger zz_subscriptions_lifetime_sem_ciclo
  before insert or update on public.subscriptions
  for each row execute function public.subscriptions_lifetime_sem_ciclo();

update public.subscriptions set billing_cycle = null
 where status = 'lifetime' and billing_cycle is not null;

commit;

select id, store_id, status, billing_cycle from public.subscriptions where status = 'lifetime';