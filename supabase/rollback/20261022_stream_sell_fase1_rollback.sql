-- ROLLBACK do Stream Sell Fase 1. ATENCAO: remove dados das colunas/tabelas novas
-- e REABRE as policies antigas (acesso total, inseguro). Use so em emergencia.
begin;

do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'live_commerce' loop
    execute format('drop policy if exists %I on live_commerce.%I', p.policyname, p.tablename);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['live_products','live_coupons','live_advantages','live_settings',
                           'live_subscribers','live_events','live_chat_messages','live_banners'] loop
    execute format('drop trigger if exists trg_set_store_id on live_commerce.%I', t);
  end loop;
  foreach t in array array['live_events','live_products','live_coupons','live_banners'] loop
    if exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='live_commerce' and tablename=t) then
      execute format('alter publication supabase_realtime drop table live_commerce.%I', t);
    end if;
  end loop;
end $$;
drop trigger if exists trg_chat_rate_limit on live_commerce.live_chat_messages;

drop table if exists live_commerce.live_keyword_rules;
drop table if exists live_commerce.live_destinations;
drop table if exists live_commerce.live_banners;

drop index if exists live_commerce.live_products_live_code_uq;
drop index if exists live_commerce.live_products_live_product_uq;
alter table live_commerce.live_products
  drop column if exists code, drop column if exists checkout_url, drop column if exists price_override,
  drop column if exists is_on_air, drop column if exists on_air_at;
alter table live_commerce.live_coupons drop column if exists is_active;
alter table live_commerce.live_events  drop column if exists platform;
alter table live_commerce.lives
  drop constraint if exists lives_source_check,
  drop column if exists source, drop column if exists active_destinations;

-- store_id: mantido nas tabelas (inofensivo). Para remover, descomente:
-- alter table live_commerce.live_products drop column store_id; (idem demais)

drop function if exists live_commerce.set_store_id_from_live();
drop function if exists live_commerce.chat_rate_limit();
drop function if exists live_commerce.is_live_public(uuid);
drop function if exists live_commerce.is_store_owner(uuid);

-- Reabre o acesso antigo
do $$
declare t text;
begin
  foreach t in array array['appearance_settings','live_advantages','live_chat_messages','live_coupons',
                           'live_events','live_products','live_settings','live_subscribers','lives'] loop
    execute format('create policy "Permitir acesso completo a %s" on live_commerce.%I for all using (true) with check (true)', t, t);
  end loop;
end $$;
alter table live_commerce.live_lives disable row level security;
grant all on all tables in schema live_commerce to anon, authenticated;

commit;