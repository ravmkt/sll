alter table public.invoices
  add column if not exists reminder_count integer not null default 0,
  add column if not exists last_reminder_at timestamptz;

-- Cobrancas que ja existem nao recebem lembrete retroativo
update public.invoices set reminder_count = 2 where status in ('pending','overdue');

create index if not exists idx_invoices_reminder
  on public.invoices (due_date)
  where status in ('pending','overdue') and reminder_count < 2;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'invoices' and column_name like 'reminder%' or column_name = 'last_reminder_at';