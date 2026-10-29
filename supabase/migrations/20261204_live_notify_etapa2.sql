-- Etapa 2: interruptores por canal, lembrete de 1h e RPC sem sobrescrever live_id
begin;

alter table live_commerce.live_notify_settings
  add column if not exists whatsapp_enabled boolean not null default true,
  add column if not exists email_enabled    boolean not null default true,
  add column if not exists before_1h        boolean not null default false;

-- Libera os novos valores ('1h' no trigger do log e 'before_1h' no kind do template)
-- removendo CHECKs antigos que mencionem essas colunas (se existirem).
do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('live_commerce.live_notification_logs'::regclass,
                         'live_commerce.live_notify_templates'::regclass)
      and (pg_get_constraintdef(c.oid) ilike '%trigger%' or pg_get_constraintdef(c.oid) ilike '%kind%')
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    raise notice 'CHECK removido: % em %', r.conname, r.tbl;
  end loop;
end $$;

-- RPC: nao sobrescreve live_id do lead existente (on conflict mantem o live_id original)
create or replace function live_commerce.register_live_lead(p_live_id uuid, p_name text, p_email text, p_whatsapp text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'live_commerce', 'public'
as $function$
declare
  v_store uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
begin
  select store_id into v_store from live_commerce.lives where id = p_live_id;
  if v_store is null then raise exception 'live_not_found'; end if;
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid_name'; end if;
  if length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if length(v_phone) < 10 or length(v_phone) > 15 then raise exception 'invalid_phone'; end if;

  insert into live_commerce.live_leads (store_id, live_id, name, email, whatsapp)
  values (v_store, p_live_id, v_name, v_email, v_phone)
  on conflict (store_id, lower(email))
  do update set name = excluded.name, whatsapp = excluded.whatsapp;

  return jsonb_build_object('ok', true);
end
$function$;

notify pgrst, 'reload schema';

commit;