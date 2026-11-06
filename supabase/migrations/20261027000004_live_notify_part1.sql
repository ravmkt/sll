alter table live_commerce.live_leads
  add column if not exists unsubscribed boolean not null default false,
  add column if not exists unsubscribed_at timestamptz;

create table if not exists live_commerce.store_whatsapp_instances (
  store_id uuid primary key,
  instance_name text not null,
  instance_token text,
  status text not null default 'disconnected',
  phone text,
  updated_at timestamptz not null default now()
);

create table if not exists live_commerce.live_notification_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid,
  lead_id uuid not null,
  live_id uuid not null,
  channel text not null check (channel in ('whatsapp','email')),
  trigger text not null check (trigger in ('24h','on_air')),
  status text not null default 'sending',
  error text,
  sent_at timestamptz not null default now(),
  unique (lead_id, live_id, channel, trigger)
);
create index if not exists idx_live_notif_logs_store on live_commerce.live_notification_logs (store_id, sent_at desc);

alter table live_commerce.store_whatsapp_instances enable row level security;
alter table live_commerce.live_notification_logs enable row level security;

drop policy if exists wa_inst_owner_select on live_commerce.store_whatsapp_instances;
create policy wa_inst_owner_select on live_commerce.store_whatsapp_instances for select to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()));

drop policy if exists notif_logs_owner_select on live_commerce.live_notification_logs;
create policy notif_logs_owner_select on live_commerce.live_notification_logs for select to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()));

grant all on live_commerce.store_whatsapp_instances to service_role;
grant all on live_commerce.live_notification_logs to service_role;
grant select on live_commerce.store_whatsapp_instances to authenticated;
grant select on live_commerce.live_notification_logs to authenticated;

select table_name, column_name from information_schema.columns
where table_schema = 'live_commerce' and table_name in ('live_notify_settings','live_notify_templates','live_leads','lives')
order by table_name, ordinal_position;