-- GESTOR: eventos brutos de webhook (Yampi e outros canais)
create table if not exists erp.webhook_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  source text not null,
  event text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_webhook_events_store on erp.webhook_events (store_id, created_at desc);
create index if not exists idx_webhook_events_event on erp.webhook_events (source, event, created_at desc);

alter table erp.webhook_events enable row level security;
grant select, insert, update, delete on erp.webhook_events to service_role;

create or replace function public.gestor_log_webhook(p_store uuid, p_source text, p_event text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare v_id uuid;
begin
  insert into erp.webhook_events (store_id, source, event, payload)
  values (p_store, p_source, p_event, p_payload)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.gestor_log_webhook(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.gestor_log_webhook(uuid, text, text, jsonb) to service_role;

notify pgrst, 'reload schema';

select 'webhook_events' as item, count(*)::text as valor from erp.webhook_events;