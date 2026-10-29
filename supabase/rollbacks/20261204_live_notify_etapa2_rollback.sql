-- Rollback da Etapa 2 (os CHECKs removidos NAO sao recriados)
begin;

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
  do update set name = excluded.name, whatsapp = excluded.whatsapp, live_id = excluded.live_id;

  return jsonb_build_object('ok', true);
end
$function$;

alter table live_commerce.live_notify_settings
  drop column if exists whatsapp_enabled,
  drop column if exists email_enabled,
  drop column if exists before_1h;

notify pgrst, 'reload schema';

commit;