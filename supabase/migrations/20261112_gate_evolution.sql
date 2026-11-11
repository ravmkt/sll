-- Gate: evolução (campanhas, eventos, limite por loja)

alter table gate.gates
  add column if not exists name text not null default 'Campanha',
  add column if not exists landing_id uuid,
  add column if not exists exclude_bots boolean not null default true,
  add column if not exists preserve_params boolean not null default true,
  add column if not exists bypass_param text not null default 'sll_bypass',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function gate.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_gates_touch on gate.gates;
create trigger trg_gates_touch before update on gate.gates
  for each row execute function gate.touch_updated_at();

-- Limite de campanhas por loja
alter table public.stores
  add column if not exists max_gates integer not null default 1;

create or replace function gate.enforce_max_gates()
returns trigger language plpgsql security definer set search_path = public, gate as $$
begin
  if (select count(*) from gate.gates where store_id = new.store_id)
     >= (select coalesce(max_gates, 1) from public.stores where id = new.store_id) then
    raise exception 'Limite de campanhas atingido para esta loja';
  end if;
  return new;
end $$;

drop trigger if exists trg_max_gates on gate.gates;
create trigger trg_max_gates before insert on gate.gates
  for each row execute function gate.enforce_max_gates();

-- Eventos (métricas)
create table if not exists gate.gate_events (
  id bigint generated always as identity primary key,
  gate_id uuid not null references gate.gates(id) on delete cascade,
  event_type text not null check (event_type in ('view','redirect','bypass','whatsapp_click')),
  host text,
  path text,
  referrer text,
  utm jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists gate_events_gate_idx on gate.gate_events (gate_id, created_at desc);
create index if not exists gate_events_type_idx on gate.gate_events (gate_id, event_type);

alter table gate.gate_events enable row level security;

drop policy if exists gate_events_select on gate.gate_events;
create policy gate_events_select on gate.gate_events for select to authenticated
  using (gate_id in (select id from gate.gates));

grant select on gate.gate_events to authenticated;
grant all on gate.gate_events to service_role;
grant usage, select on all sequences in schema gate to service_role;

-- Resumo por período (respeita RLS)
create or replace function gate.gate_summary(p_gate uuid, p_days int default 7)
returns table (event_type text, total bigint)
language sql stable security invoker set search_path = gate as $$
  select e.event_type, count(*)::bigint
  from gate.gate_events e
  where e.gate_id = p_gate
    and e.created_at >= now() - make_interval(days => p_days)
  group by e.event_type
$$;

grant execute on function gate.gate_summary(uuid, int) to authenticated;
