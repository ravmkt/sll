-- Status da loja calculado a partir de TODAS as assinaturas atuais
create or replace function public._calc_store_status(p_store_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s record;
  pd boolean; ac boolean; tr boolean;
begin
  select subscription_status, trial_ends_at into s from public.stores where id = p_store_id;
  if not found then return null; end if;

  select coalesce(bool_or(status = 'past_due'), false),
         coalesce(bool_or(status in ('active', 'lifetime')), false),
         coalesce(bool_or(status = 'trialing'), false)
    into pd, ac, tr
  from public.subscriptions
  where store_id = p_store_id and is_current = true;

  if pd then return 'past_due'; end if;
  if ac then return 'active'; end if;
  if tr then return 'trialing'; end if;
  if s.subscription_status = 'trialing' and s.trial_ends_at > now() then return 'trialing'; end if;
  return 'canceled';
end;
$$;

create or replace function public.recompute_store_status(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v text;
begin
  v := public._calc_store_status(p_store_id);
  if v is null then return; end if;
  update public.stores
     set subscription_status = v,
         past_due_since = case when v = 'past_due' then coalesce(past_due_since, now()) else null end,
         updated_at = now()
   where id = p_store_id
     and (subscription_status is distinct from v
          or (v <> 'past_due' and past_due_since is not null)
          or (v = 'past_due' and past_due_since is null));
end;
$$;

create or replace function public.trg_recompute_store_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_store_status(coalesce(new.store_id, old.store_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sub_store_status on public.subscriptions;
create trigger trg_sub_store_status
  after insert or delete or update of status, is_current
  on public.subscriptions
  for each row execute function public.trg_recompute_store_status();

-- Fim do trial: marca a loja como cancelada se nao houver assinatura valida
create or replace function public.expire_trials()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare r record; n int := 0;
begin
  for r in select id from public.stores
           where subscription_status = 'trialing' and trial_ends_at < now()
  loop
    perform public.recompute_store_status(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public._calc_store_status(uuid) from public, anon, authenticated;
revoke all on function public.recompute_store_status(uuid) from public, anon, authenticated;
revoke all on function public.expire_trials() from public, anon, authenticated;

do $$ begin perform cron.unschedule('expire-trials'); exception when others then null; end $$;
select cron.schedule('expire-trials', '0 6 * * *', $cron$select public.expire_trials()$cron$);

-- Remove a fatura duplicada: a edge function passa a ser a unica fonte
drop trigger if exists trg_process_asaas_webhook on public.asaas_webhook_events;

-- Previa: lojas cujo status vai mudar na proxima recalculada (nada foi alterado ainda)
select s.id, s.name, s.subscription_status as atual, public._calc_store_status(s.id) as calculado
from public.stores s
where s.subscription_status is distinct from public._calc_store_status(s.id);