begin;

do $$
declare
  v_exceptions text[] := array['live_events', 'live_chat_messages', 'live_subscribers']::text[];
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','p','v','m','f')
      and c.relname <> all (v_exceptions)
  loop
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on public.%I from anon',
      r.relname);
  end loop;
end $$;

revoke usage, update on all sequences in schema public from anon;

alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke usage, update on sequences from anon;

commit;
