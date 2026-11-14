alter table public.yampi_connections
  add column if not exists script_id bigint,
  add column if not exists script_gate boolean not null default false,
  add column if not exists script_updated_at timestamptz;
