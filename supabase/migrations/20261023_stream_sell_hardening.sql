-- Stream Sell: hardening pos-Fase 1
begin;

-- 1. appearance_templates e privilegios perigosos
revoke all on live_commerce.appearance_templates from anon, authenticated;
grant select, insert, update, delete on live_commerce.appearance_templates to authenticated;
drop policy if exists owner_all on live_commerce.appearance_templates;
drop policy if exists superadmin_all on live_commerce.appearance_templates;
create policy owner_all on live_commerce.appearance_templates for all to authenticated
  using (live_commerce.is_store_owner(store_id)) with check (live_commerce.is_store_owner(store_id));
create policy superadmin_all on live_commerce.appearance_templates for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

revoke truncate, references, trigger on all tables in schema live_commerce from anon, authenticated;
alter default privileges in schema live_commerce revoke all on tables from anon, authenticated;

-- 2. FKs apontando para a tabela antiga live_lives -> lives
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'live_commerce.live_lives'::regclass
      and c.conrelid = any (array[
        'live_commerce.live_advantages'::regclass,
        'live_commerce.live_chat_messages'::regclass,
        'live_commerce.live_settings'::regclass,
        'live_commerce.live_subscribers'::regclass])
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (live_id) references live_commerce.lives(id) on delete cascade not valid', r.tbl, r.conname);
  end loop;
end $$;

-- 3. live_events.product_id: log nao deve bloquear por FK divergente
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'live_commerce.live_events'::regclass
      and contype = 'f' and confrelid::regclass::text like '%sll_products'
  loop
    execute format('alter table live_commerce.live_events drop constraint %I', r.conname);
  end loop;
end $$;

-- 4. Eventos publicos: sem eventos de controle
drop policy if exists public_insert on live_commerce.live_events;
create policy public_insert on live_commerce.live_events for insert to anon, authenticated
  with check (
    live_commerce.is_live_public(live_id)
    and platform = 'site'
    and char_length(event_type) between 1 and 40
    and event_type !~ '^(live|product|coupon|banner)\.'
    and coalesce(pg_column_size(metadata), 0) < 4096
  );

-- 5. Chat: session_id obrigatorio (rate limit efetivo)
drop policy if exists public_insert on live_commerce.live_chat_messages;
create policy public_insert on live_commerce.live_chat_messages for insert to anon, authenticated
  with check (
    live_commerce.is_live_public(live_id)
    and coalesce(is_from_store, false) = false
    and session_id is not null
    and char_length(btrim(message)) between 1 and 500
  );

-- 6. Conversoes: somente dono da loja ou superadmin
drop policy if exists "store_members_read_conversions" on public.sll_conversions;
drop policy if exists "store_owner_read_conversions" on public.sll_conversions;
create policy "store_owner_read_conversions" on public.sll_conversions for select to authenticated
  using (
    public.is_superadmin()
    or exists (select 1 from public.stores s where s.id = sll_conversions.store_id and s.owner_user_id = auth.uid())
  );

-- 7. NOT NULL em store_id (corrigido)
do $$
declare t text; n bigint;
begin
  foreach t in array array['live_products','live_coupons','live_advantages','live_settings',
                           'live_subscribers','live_events','live_chat_messages'] loop
    execute format('select count(*) from live_commerce.%I where store_id is null', t) into n;
    if n = 0 then
      execute format('alter table live_commerce.%I alter column store_id set not null', t);
    else
      raise notice '% tem % linhas sem store_id (NOT NULL nao aplicado)', t, n;
    end if;
  end loop;
end $$;

commit;