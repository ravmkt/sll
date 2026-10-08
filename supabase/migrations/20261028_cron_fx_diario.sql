create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create or replace function public.cron_sync_fx()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r extensions.http_response;
  v numeric;
begin
  select * into r from extensions.http_get('https://economia.awesomeapi.com.br/last/USD-BRL');
  v := (r.content::jsonb -> 'USDBRL' ->> 'bid')::numeric;
  if v is null or v <= 0 then return; end if;
  update public.infrastructure_cost_settings
     set usd_to_brl_rate = v, last_currency_sync_at = now(), updated_at = now()
   where id = 1 and auto_sync_currency;
  if found then
    insert into public.fx_rate_history (day, rate)
    values ((now() at time zone 'America/Sao_Paulo')::date, v)
    on conflict (day) do update set rate = excluded.rate;
  end if;
end;
$$;

revoke all on function public.cron_sync_fx() from public, anon, authenticated;

select cron.schedule('sync-fx-daily', '0 9 * * *', $cron$select public.cron_sync_fx()$cron$);

select public.cron_sync_fx();
select usd_to_brl_rate, last_currency_sync_at from public.infrastructure_cost_settings;