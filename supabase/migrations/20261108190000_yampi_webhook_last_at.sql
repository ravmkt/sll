alter table public.yampi_connections
  add column if not exists webhook_last_at timestamptz;
