do $$
declare s text;
begin
  select table_schema into s from information_schema.tables
   where table_name = 'live_notify_settings'
   order by (table_schema = 'live_commerce') desc limit 1;
  if s is null then raise exception 'live_notify_settings nao encontrada'; end if;
  execute format('alter table %I.live_notify_settings add column if not exists evolution_instance text', s);
  execute format('alter table %I.live_notify_settings add column if not exists evolution_token text', s);
  execute format('alter table %I.live_notify_settings add column if not exists evolution_status text not null default ''disconnected''', s);
  execute format('alter table %I.live_notify_settings add column if not exists evolution_number text', s);
  execute format('alter table %I.live_notify_settings add column if not exists evolution_connected_at timestamptz', s);
end $$;

select table_schema, column_name from information_schema.columns
 where table_name = 'live_notify_settings' order by ordinal_position;