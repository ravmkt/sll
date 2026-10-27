create table if not exists live_commerce.live_notify_settings (
  store_id uuid primary key,
  enabled boolean not null default false,
  before_24h boolean not null default true,
  on_start boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table live_commerce.live_notify_settings enable row level security;

grant select, insert, update on live_commerce.live_notify_settings to authenticated;
grant all on live_commerce.live_notify_settings to service_role;

drop policy if exists notify_owner_all on live_commerce.live_notify_settings;
create policy notify_owner_all on live_commerce.live_notify_settings
  for all to authenticated
  using (live_commerce.is_store_owner(store_id))
  with check (live_commerce.is_store_owner(store_id));

notify pgrst, 'reload schema';