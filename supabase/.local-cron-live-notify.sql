create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'live-notify-sender';
select cron.schedule('live-notify-sender', '*/2 * * * *', $$
  select net.http_post(
    url := 'https://flivmllysdhaydhogmhg.supabase.co/functions/v1/live_notify_sender',
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret','ee39803dfb244b2fb40d09d4a9c26728777bb08c1d874abfb45da910e6eb8134'),
    body := '{}'::jsonb
  )
$$);