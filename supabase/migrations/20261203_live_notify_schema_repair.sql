-- Reparo do schema usado por live_notify_sender, live_notify_connect e live_notify_webhook.
-- Idempotente. Nao cria store_whatsapp_instances (o codigo atual nao usa).
begin;

do $$
begin
  if to_regclass('live_commerce.live_leads') is null then
    raise exception 'live_commerce.live_leads nao existe: aplique antes 20261027_live_leads.sql';
  end if;
end $$;

-- 1) Opt-out nos leads
alter table live_commerce.live_leads
  add column if not exists unsubscribed boolean not null default false,
  add column if not exists unsubscribed_at timestamptz;

-- 2) Configuracao da regua + instancia Evolution por loja
create table if not exists live_commerce.live_notify_settings (
  store_id uuid primary key,
  enabled boolean not null default false,
  before_24h boolean not null default true,
  on_start boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table live_commerce.live_notify_settings
  add column if not exists enabled boolean not null default false,
  add column if not exists before_24h boolean not null default true,
  add column if not exists on_start boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists evolution_instance text,
  add column if not exists evolution_token text,
  add column if not exists evolution_status text not null default 'disconnected',
  add column if not exists evolution_number text,
  add column if not exists evolution_connected_at timestamptz;

alter table live_commerce.live_notify_settings enable row level security;
grant select, insert, update on live_commerce.live_notify_settings to authenticated;
grant all on live_commerce.live_notify_settings to service_role;

-- 3) Templates lidos pelo sender
create table if not exists live_commerce.live_notify_templates (
  store_id uuid not null,
  channel text not null check (channel in ('whatsapp','email')),
  kind text not null check (kind in ('before_24h','on_start')),
  subject text not null default '',
  body text not null check (length(body) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (store_id, channel, kind)
);

alter table live_commerce.live_notify_templates enable row level security;
grant select, insert, update on live_commerce.live_notify_templates to authenticated;
grant all on live_commerce.live_notify_templates to service_role;

-- 4) Log de envios (dedupe)
create table if not exists live_commerce.live_notification_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid,
  lead_id uuid not null,
  live_id uuid not null,
  channel text not null check (channel in ('whatsapp','email')),
  trigger text not null check (trigger in ('24h','on_air')),
  status text not null default 'sending',
  error text,
  sent_at timestamptz not null default now()
);

alter table live_commerce.live_notification_logs
  add column if not exists store_id uuid,
  add column if not exists status text not null default 'sending',
  add column if not exists error text,
  add column if not exists sent_at timestamptz not null default now();

create unique index if not exists live_notif_logs_dedupe_uidx
  on live_commerce.live_notification_logs (lead_id, live_id, channel, trigger);
create index if not exists idx_live_notif_logs_store
  on live_commerce.live_notification_logs (store_id, sent_at desc);

alter table live_commerce.live_notification_logs enable row level security;
grant select on live_commerce.live_notification_logs to authenticated;
grant all on live_commerce.live_notification_logs to service_role;

-- 5) Policies (so se ainda nao existirem)
do $$
begin
  if to_regprocedure('live_commerce.is_store_owner(uuid)') is not null then
    if not exists (select 1 from pg_policies where schemaname = 'live_commerce'
                   and tablename = 'live_notify_settings' and policyname = 'notify_owner_all') then
      execute 'create policy notify_owner_all on live_commerce.live_notify_settings for all to authenticated
               using (live_commerce.is_store_owner(store_id)) with check (live_commerce.is_store_owner(store_id))';
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'live_commerce'
                   and tablename = 'live_notify_templates' and policyname = 'notify_tpl_owner_all') then
      execute 'create policy notify_tpl_owner_all on live_commerce.live_notify_templates for all to authenticated
               using (live_commerce.is_store_owner(store_id)) with check (live_commerce.is_store_owner(store_id))';
    end if;
  else
    raise notice 'is_store_owner(uuid) nao existe: policies de settings/templates NAO criadas.';
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'live_commerce'
                 and tablename = 'live_notification_logs' and policyname = 'notif_logs_owner_select') then
    execute 'create policy notif_logs_owner_select on live_commerce.live_notification_logs for select to authenticated
             using (store_id in (select id from public.stores where owner_user_id = auth.uid()))';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;