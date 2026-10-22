-- Stream Sell, Fase 1 (idempotente). Schema exclusivo: live_commerce
begin;

-- ===== 0. Funcoes auxiliares =====
create or replace function live_commerce.is_store_owner(p_store uuid)
returns boolean language sql stable security definer
set search_path = public, live_commerce as $$
  select exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid());
$$;
revoke all on function live_commerce.is_store_owner(uuid) from public, anon;
grant execute on function live_commerce.is_store_owner(uuid) to authenticated, service_role;

create or replace function live_commerce.is_live_public(p_live uuid)
returns boolean language sql stable security definer
set search_path = public, live_commerce as $$
  select exists (
    select 1 from live_commerce.lives l
    where l.id = p_live and l.is_active is true
      and l.status in ('scheduled','live','ended','finished')
  );
$$;
grant execute on function live_commerce.is_live_public(uuid) to anon, authenticated, service_role;

create or replace function live_commerce.set_store_id_from_live()
returns trigger language plpgsql security definer
set search_path = public, live_commerce as $$
declare v uuid;
begin
  select store_id into v from live_commerce.lives where id = new.live_id;
  if v is null then raise exception 'Live nao encontrada'; end if;
  new.store_id := v;
  return new;
end $$;

create or replace function live_commerce.chat_rate_limit()
returns trigger language plpgsql security definer
set search_path = public, live_commerce as $$
begin
  if new.session_id is not null and not coalesce(new.is_from_store, false) and exists (
    select 1 from live_commerce.live_chat_messages m
    where m.live_id = new.live_id and m.session_id = new.session_id
      and m.created_at > now() - interval '2 seconds'
  ) then
    raise exception 'Aguarde um instante antes de enviar outra mensagem';
  end if;
  return new;
end $$;

-- ===== 1. store_id nas tabelas filhas (coluna, backfill, indice, trigger) =====
do $$
declare t text;
begin
  foreach t in array array['live_products','live_coupons','live_advantages','live_settings',
                           'live_subscribers','live_events','live_chat_messages'] loop
    execute format('alter table live_commerce.%I add column if not exists store_id uuid', t);
    execute format('update live_commerce.%I x set store_id = l.store_id from live_commerce.lives l where l.id = x.live_id and x.store_id is null', t);
    execute format('create index if not exists %I on live_commerce.%I (store_id)', t || '_store_idx', t);
    execute format('drop trigger if exists trg_set_store_id on live_commerce.%I', t);
    execute format('create trigger trg_set_store_id before insert or update of live_id on live_commerce.%I for each row execute function live_commerce.set_store_id_from_live()', t);
  end loop;
end $$;

drop trigger if exists trg_chat_rate_limit on live_commerce.live_chat_messages;
create trigger trg_chat_rate_limit before insert on live_commerce.live_chat_messages
  for each row execute function live_commerce.chat_rate_limit();

-- ===== 2. Colunas novas =====
alter table live_commerce.lives
  add column if not exists source text not null default 'youtube_link',
  add column if not exists active_destinations jsonb not null default '["site"]'::jsonb;
alter table live_commerce.lives alter column youtube_url drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lives_source_check') then
    alter table live_commerce.lives add constraint lives_source_check
      check (source in ('youtube_link','sll_stream'));
  end if;
end $$;

alter table live_commerce.live_products
  add column if not exists code text,
  add column if not exists checkout_url text,
  add column if not exists price_override numeric(12,2),
  add column if not exists is_on_air boolean not null default false,
  add column if not exists on_air_at timestamptz;
create unique index if not exists live_products_live_code_uq
  on live_commerce.live_products (live_id, code) where code is not null;
create unique index if not exists live_products_live_product_uq
  on live_commerce.live_products (live_id, product_id);

alter table live_commerce.live_coupons add column if not exists is_active boolean not null default true;
alter table live_commerce.live_coupons alter column is_active set default false;

alter table live_commerce.live_events add column if not exists platform text not null default 'site';

-- store_id obrigatorio onde ja foi preenchido
do $$
declare t text;
begin
  foreach t in array array['live_products','live_coupons','live_advantages','live_settings'] loop
    if not exists (select 1 from information_schema.columns where table_schema='live_commerce' and table_name=t and column_name='store_id' and is_nullable='NO')
       and not exists (select 1 from pg_catalog.pg_class c join pg_namespace n on n.oid=c.relnamespace where false) then
      execute format('select 1 from live_commerce.%I where store_id is null limit 1', t);
      if not found then execute format('alter table live_commerce.%I alter column store_id set not null', t); end if;
    end if;
  end loop;
end $$;

-- ===== 3. Tabelas novas =====
create table if not exists live_commerce.live_banners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  live_id uuid not null references live_commerce.lives(id) on delete cascade,
  title text,
  image_url text not null,
  link_url text,
  display_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists live_banners_live_idx on live_commerce.live_banners (live_id);
drop trigger if exists trg_set_store_id on live_commerce.live_banners;
create trigger trg_set_store_id before insert or update of live_id on live_commerce.live_banners
  for each row execute function live_commerce.set_store_id_from_live();

create table if not exists live_commerce.live_destinations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  platform text not null check (platform in ('youtube','instagram','tiktok')),
  status text not null default 'not_connected'
    check (status in ('not_connected','connected','error','expired')),
  external_account text,
  credentials_encrypted text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, platform)
);

create table if not exists live_commerce.live_keyword_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  live_id uuid references live_commerce.lives(id) on delete cascade,
  keyword text not null,
  reply_text text not null,
  include_checkout_link boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists live_keyword_rules_store_idx on live_commerce.live_keyword_rules (store_id);

-- ===== 4. RLS =====
do $$
declare t text; p record;
begin
  for p in select tablename from pg_tables where schemaname = 'live_commerce' loop
    execute format('alter table live_commerce.%I enable row level security', p.tablename);
  end loop;
  for p in select policyname, tablename from pg_policies where schemaname = 'live_commerce' loop
    execute format('drop policy if exists %I on live_commerce.%I', p.policyname, p.tablename);
  end loop;

  foreach t in array array['lives','live_products','live_coupons','live_banners','live_advantages',
                           'live_settings','appearance_settings','live_keyword_rules',
                           'live_chat_messages','live_subscribers'] loop
    execute format('create policy owner_all on live_commerce.%I for all to authenticated using (live_commerce.is_store_owner(store_id)) with check (live_commerce.is_store_owner(store_id))', t);
    execute format('create policy superadmin_all on live_commerce.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', t);
  end loop;
end $$;

create policy superadmin_all on live_commerce.live_lives for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy owner_select on live_commerce.live_events for select to authenticated using (live_commerce.is_store_owner(store_id));
create policy owner_insert on live_commerce.live_events for insert to authenticated with check (live_commerce.is_store_owner(store_id));
create policy superadmin_select on live_commerce.live_events for select to authenticated using (public.is_superadmin());

create policy owner_select on live_commerce.live_destinations for select to authenticated using (live_commerce.is_store_owner(store_id));
create policy superadmin_select on live_commerce.live_destinations for select to authenticated using (public.is_superadmin());

-- Leitura/escrita publica (widget anonimo)
create policy public_read on live_commerce.lives for select to anon, authenticated
  using (is_active is true and status in ('scheduled','live','ended','finished'));
create policy public_read on live_commerce.live_products for select to anon, authenticated
  using (live_commerce.is_live_public(live_id));
create policy public_read on live_commerce.live_advantages for select to anon, authenticated
  using (live_commerce.is_live_public(live_id));
create policy public_read_active on live_commerce.live_coupons for select to anon, authenticated
  using (is_active and live_commerce.is_live_public(live_id));
create policy public_read_active on live_commerce.live_banners for select to anon, authenticated
  using (is_active and live_commerce.is_live_public(live_id));
create policy public_read on live_commerce.live_chat_messages for select to anon, authenticated
  using (live_commerce.is_live_public(live_id));
create policy public_insert on live_commerce.live_chat_messages for insert to anon, authenticated
  with check (live_commerce.is_live_public(live_id) and coalesce(is_from_store, false) = false
              and char_length(message) between 1 and 500);
create policy public_read_cockpit on live_commerce.live_events for select to anon, authenticated
  using (live_commerce.is_live_public(live_id)
         and event_type in ('live.start','live.end','product.show','product.hide',
                            'coupon.activate','coupon.deactivate','banner.show','banner.hide'));
create policy public_insert on live_commerce.live_events for insert to anon, authenticated
  with check (live_commerce.is_live_public(live_id));
create policy public_insert on live_commerce.live_subscribers for insert to anon, authenticated
  with check (live_commerce.is_live_public(live_id));
create policy public_read on live_commerce.appearance_settings for select to anon, authenticated using (true);

-- ===== 5. Grants =====
revoke all on all tables in schema live_commerce from anon, authenticated;
grant usage on schema live_commerce to anon, authenticated, service_role;
grant all on all tables in schema live_commerce to service_role;

grant select, insert, update, delete on
  live_commerce.lives, live_commerce.live_products, live_commerce.live_coupons,
  live_commerce.live_banners, live_commerce.live_advantages, live_commerce.live_settings,
  live_commerce.appearance_settings, live_commerce.live_keyword_rules,
  live_commerce.live_chat_messages, live_commerce.live_subscribers, live_commerce.live_lives
  to authenticated;
grant select, insert on live_commerce.live_events to authenticated;
grant select (id, store_id, platform, status, external_account, connected_at, created_at, updated_at)
  on live_commerce.live_destinations to authenticated;

grant select on live_commerce.lives, live_commerce.live_products, live_commerce.live_advantages,
  live_commerce.live_coupons, live_commerce.live_banners, live_commerce.live_chat_messages,
  live_commerce.live_events, live_commerce.appearance_settings to anon;
grant insert on live_commerce.live_events, live_commerce.live_chat_messages,
  live_commerce.live_subscribers to anon;

-- ===== 6. Realtime =====
do $$
declare t text;
begin
  foreach t in array array['live_events','live_products','live_coupons','live_banners'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'live_commerce' and tablename = t) then
      execute format('alter publication supabase_realtime add table live_commerce.%I', t);
    end if;
  end loop;
end $$;
alter table live_commerce.live_products replica identity full;
alter table live_commerce.live_coupons  replica identity full;
alter table live_commerce.live_banners  replica identity full;

commit;