-- Rollback: remove o agendamento do disparo de avisos.
begin;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'live-notify-sender') then
    perform cron.unschedule('live-notify-sender');
  end if;
end $$;

commit;