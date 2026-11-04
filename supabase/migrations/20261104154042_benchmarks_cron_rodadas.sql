do $$
declare
  r int;
  j text;
  base text := 'https://flivmllysdhaydhogmhg.supabase.co/functions/v1/update-sector-benchmarks';
begin
  for j in
    select jobname from cron.job
    where jobname in ('benchmarks-semestral-janeiro','benchmarks-semestral-julho','update-sector-benchmarks')
       or jobname like 'benchmarks-jan-r%' or jobname like 'benchmarks-jul-r%'
  loop
    perform cron.unschedule(j);
  end loop;

  for r in 0..5 loop
    perform cron.schedule(
      format('benchmarks-jan-r%s', r + 1),
      format('%s 9 2 1 *', r * 3),
      format($c$select net.http_post(url := %L, headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'internal_secret' limit 1)), body := jsonb_build_object('offset', %s, 'limit', 2), timeout_milliseconds := 120000);$c$, base, r * 2)
    );
    perform cron.schedule(
      format('benchmarks-jul-r%s', r + 1),
      format('%s 9 1 7 *', r * 3),
      format($c$select net.http_post(url := %L, headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'internal_secret' limit 1)), body := jsonb_build_object('offset', %s, 'limit', 2), timeout_milliseconds := 120000);$c$, base, r * 2)
    );
  end loop;
end $$;