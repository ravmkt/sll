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
    update public.noah_settings set usd_brl = v where id = 1;
  end if;
end;
$$;

update public.noah_settings
   set usd_brl = (select usd_to_brl_rate from public.infrastructure_cost_settings where id = 1)
 where id = 1;

select s.usd_to_brl_rate as global, n.usd_brl as noah
from public.infrastructure_cost_settings s, public.noah_settings n where s.id = 1 and n.id = 1;