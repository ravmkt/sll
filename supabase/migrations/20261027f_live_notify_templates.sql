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

drop policy if exists notify_tpl_owner_all on live_commerce.live_notify_templates;
create policy notify_tpl_owner_all on live_commerce.live_notify_templates
  for all to authenticated
  using (live_commerce.is_store_owner(store_id))
  with check (live_commerce.is_store_owner(store_id));

notify pgrst, 'reload schema';