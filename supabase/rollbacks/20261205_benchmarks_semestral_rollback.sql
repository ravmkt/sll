-- Rollback: remove o agendamento semestral (o modelo nao e revertido).
select cron.unschedule(jobid) from cron.job where jobname in ('benchmarks-semestral-janeiro', 'benchmarks-semestral-julho');