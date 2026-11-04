-- Benchmarks: modelo e agendamento semestral automatico.
-- Horarios em UTC: 09:00 UTC = 06:00 de Brasilia.
-- O segredo e lido do Vault (name = 'internal_secret'), sem valor em texto neste arquivo.
begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

update public.admin_ai_settings
   set model = 'gemini-3.1-flash-lite',
       fallback_model = 'gemini-3-flash-preview'
 where purpose = 'benchmarks';

do $$
begin
  if not exists (select 1 from public.noah_models where model = 'gemini-3-flash-preview') then
    raise notice 'AVISO: gemini-3-flash-preview sem preco em noah_models; o custo dele aparecera zerado.';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'internal_secret') then
    raise notice 'AVISO: segredo internal_secret nao existe no Vault; o cron nao conseguira autenticar.';
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname in ('benchmarks-semestral-janeiro', 'benchmarks-semestral-julho');
end $$;

select cron.schedule(
  'benchmarks-semestral-janeiro',
  '0 9 2 1 *',
  $cron$
  select net.http_post(
    url := 'https://flivmllysdhaydhogmhg.supabase.co/functions/v1/update-sector-benchmarks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'internal_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);

select cron.schedule(
  'benchmarks-semestral-julho',
  '0 9 1 7 *',
  $cron$
  select net.http_post(
    url := 'https://flivmllysdhaydhogmhg.supabase.co/functions/v1/update-sector-benchmarks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'internal_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);

commit;

-- CONFERENCIA 1: agendamentos (esperado: 2 linhas ativas)
select jobname, schedule, active from cron.job where jobname like 'benchmarks-semestral%' order by jobname;
-- CONFERENCIA 2: modelo
select purpose, model, fallback_model, enabled from public.admin_ai_settings where purpose = 'benchmarks';