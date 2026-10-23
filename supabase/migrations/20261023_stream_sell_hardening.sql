-- Stream Sell: hardening pos-Fase 1 (v2). Aplicar no SQL Editor do projeto SLL.
begin;

-- 0. Pre-flight
do $$
declare t text;
begin
  if to_regclass('live_commerce.lives') is null then raise exception 'live_commerce.lives nao existe'; end if;
  foreach t in array array['live_chat_messages','live_events','live_subscribers'] loop
    if not exists (select 1 from pg_trigger
                   where tgname = 'trg_set_store_id' and tgrelid = ('live_commerce.' || t)::regclass and not tgisinternal) then
      raise exception 'trigger trg_set_store_id ausente em %', t;
    end if;
  end loop;
end $$;

-- 1. Policies com role {public} em live_commerce: remover (appearance_templates e recriada abaixo)
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'live_commerce' and roles = '{public}'
  loop
    execute format('drop policy if exists %I on live_commerce.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy owner_all on live_commerce.appearance_templates for all to authenticated
  using (live_commerce.is_store_owner(store_id)) with check (live_commerce.is_store_owner(store_id));
create policy superadmin_all on live_commerce.appearance_templates for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- 2. Grants: anon = minimo
revoke all on all tables in schema live_commerce from anon;
revoke all on all sequences in schema live_commerce from anon;
alter default privileges in schema live_commerce revoke all on tables from anon;

grant select on
  live_commerce.appearance_settings, live_commerce.live_advantages, live_commerce.live_banners,
  live_commerce.live_coupons, live_commerce.live_chat_messages, live_commerce.live_events,
  live_commerce.live_products, live_commerce.lives
  to anon;
grant insert on live_commerce.live_chat_messages, live_commerce.live_events to anon;

-- sequences necessarias para o INSERT do anon (se houver serial/identity)
do $$
declare t text; c record; s text;
begin
  foreach t in array array['live_chat_messages','live_events'] loop
    for c in select column_name from information_schema.columns
             where table_schema = 'live_commerce' and table_name = t loop
      s := pg_get_serial_sequence('live_commerce.' || t, c.column_name);
      if s is not null then execute format('grant usage on sequence %s to anon', s); end if;
    end loop;
  end loop;
end $$;

-- authenticated: sem privilegios perigosos
revoke truncate, references, trigger on all tables in schema live_commerce from authenticated;
revoke all on live_commerce.appearance_templates from authenticated;
grant select, insert, update, delete on live_commerce.appearance_templates to authenticated;

-- 3. Functions (lista explicita; RPCs do widget em public NAO sao tocadas)
revoke execute on function live_commerce.set_store_id_from_live() from public, anon, authenticated;
revoke execute on function live_commerce.chat_rate_limit() from public, anon, authenticated;
revoke execute on function live_commerce.is_store_owner(uuid) from public, anon;
grant  execute on function live_commerce.is_store_owner(uuid) to authenticated, service_role;
revoke execute on function live_commerce.is_live_public(uuid) from public;
grant  execute on function live_commerce.is_live_public(uuid) to anon, authenticated, service_role;

-- 4. FKs live_lives -> lives (NOT VALID)
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'live_commerce.live_lives'::regclass
      and c.conrelid = any (array[
        'live_commerce.live_advantages'::regclass, 'live_commerce.live_chat_messages'::regclass,
        'live_commerce.live_settings'::regclass,   'live_commerce.live_subscribers'::regclass])
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (live_id) references live_commerce.lives(id) on delete cascade not valid', r.tbl, r.conname);
  end loop;
end $$;

-- 5. live_events: sem FK em product_id; platform com default; insert publico restrito
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'live_commerce.live_events'::regclass and contype = 'f'
             and confrelid::regclass::text like '%sll_products'
  loop
    execute format('alter table live_commerce.live_events drop constraint %I', r.conname);
  end loop;
end $$;

alter table live_commerce.live_events alter column platform set default 'site';

drop policy if exists public_insert on live_commerce.live_events;
create policy public_insert on live_commerce.live_events for insert to anon, authenticated
  with check (
    live_commerce.is_live_public(live_id)
    and platform = 'site'
    and char_length(event_type) between 1 and 40
    and event_type !~ '^(live|product|coupon|banner)\.'
    and coalesce(pg_column_size(metadata), 0) < 4096
  );

-- 6. Chat: session_id ainda OPCIONAL (transicao do cache do widget); teto por live
create index if not exists live_chat_messages_live_created_idx
  on live_commerce.live_chat_messages (live_id, created_at desc);

create or replace function live_commerce.chat_rate_limit()
returns trigger language plpgsql security definer
set search_path = public, live_commerce as $$
begin
  if coalesce(new.is_from_store, false) then return new; end if;

  if new.session_id is not null and exists (
    select 1 from live_commerce.live_chat_messages m
    where m.live_id = new.live_id and m.session_id = new.session_id
      and m.created_at > now() - interval '2 seconds'
  ) then
    raise exception 'Aguarde um instante antes de enviar outra mensagem';
  end if;

  if (select count(*) from live_commerce.live_chat_messages m
      where m.live_id = new.live_id and not coalesce(m.is_from_store, false)
        and m.created_at > now() - interval '10 seconds') >= 60 then
    raise exception 'Chat muito movimentado, tente novamente em instantes';
  end if;
  return new;
end $$;
revoke execute on function live_commerce.chat_rate_limit() from public, anon, authenticated;

drop policy if exists public_insert on live_commerce.live_chat_messages;
create policy public_insert on live_commerce.live_chat_messages for insert to anon, authenticated
  with check (
    live_commerce.is_live_public(live_id)
    and coalesce(is_from_store, false) = false
    and char_length(btrim(message)) between 1 and 500
    and char_length(coalesce(author_name, '')) <= 60
  );

-- 7. Conversoes: dono, membro da equipe ou superadmin
drop policy if exists "store_members_read_conversions" on public.sll_conversions;
drop policy if exists "store_owner_read_conversions" on public.sll_conversions;
create policy "store_owner_read_conversions" on public.sll_conversions for select to authenticated
  using (public.is_superadmin() or public.is_store_owner_or_member(store_id));

-- 8. Backfill + NOT NULL em store_id (triggers ja garantem o preenchimento)
do $$
declare t text; n bigint;
begin
  foreach t in array array['live_products','live_coupons','live_advantages','live_settings',
                           'live_subscribers','live_events','live_chat_messages'] loop
    execute format('update live_commerce.%I x set store_id = l.store_id from live_commerce.lives l where l.id = x.live_id and x.store_id is null', t);
    execute format('select count(*) from live_commerce.%I where store_id is null', t) into n;
    if n = 0 then
      execute format('alter table live_commerce.%I alter column store_id set not null', t);
    else
      raise notice '% tem % linhas sem store_id (NOT NULL nao aplicado)', t, n;
    end if;
  end loop;
end $$;

commit;