begin;

do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name <> 'is_super_admin';

  execute 'revoke update on public.profiles from anon, authenticated';
  execute 'grant update (' || cols || ') on public.profiles to authenticated';
end $$;

drop policy if exists "Público envia mensagem em live ativa" on public.live_chat_messages;
create policy "Público envia mensagem em live ativa" on public.live_chat_messages
  for insert
  with check (
    is_from_store = false
    and live_id in (
      select l.id from public.lives l
      where l.is_active = true and l.store_id = live_chat_messages.store_id)
    and length(btrim(coalesce(message, ''))) between 1 and 500
    and length(coalesce(author_name, '')) <= 80
    and length(coalesce(session_id, '')) <= 100
  );

drop policy if exists "live_events_insert_active_live" on public.live_events;
create policy "live_events_insert_active_live" on public.live_events
  for insert to anon, authenticated
  with check (
    live_id in (select l.id from public.lives l where l.is_active = true)
    and length(coalesce(event_type, '')) between 1 and 50
    and (metadata is null or pg_column_size(metadata) <= 2048)
  );

commit;
