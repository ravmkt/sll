-- Desliga o disparo automatico de avisos. Nada e apagado.
-- Para religar: execute novamente 20261202_live_notify_cron.sql
do $$
begin
  if exists (select 1 from cron.job where jobname = 'live-notify-sender') then
    perform cron.unschedule('live-notify-sender');
  end if;
end $$;
