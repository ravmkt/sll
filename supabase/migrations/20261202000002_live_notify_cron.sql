-- Cron do disparo de avisos do Stream Sell (a cada 2 minutos).
-- O segredo e lido do Vault (name = 'internal_secret'); nenhum valor em texto neste arquivo.
-- Pre-requisito: o valor de vault 'internal_secret' deve ser igual ao segredo INTERNAL_TEST_SECRET da funcao.
begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'live-notify-sender') then
    perform cron.unschedule('live-notify-sender');
  end if;
end $$;

select cron.schedule(
  'live-notify-sender',
  '*/2 * * * *',
  $cron$
  select net.http_post(
    url := 'https://flivmllysdhaydhogmhg.supabase.co/functions/v1/live_notify_sender',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'internal_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 110000
  );
  $cron$
);

commit;