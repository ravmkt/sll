-- 1) Quota (vidlytics: videos, storage, plays): lojas vitalicias nunca bloqueiam
create or replace function public._quota_state(p_store_id uuid, p_kind text, p_extra numeric default 0)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  l jsonb;
  v_used numeric := 0;
  v_lim numeric;
  v_pct numeric;
  v_level text := 'ok';
begin
  if not (public.get_store_active_modules(p_store_id) ? 'vidlytics') then
    return jsonb_build_object('allowed', false, 'level', 'blocked', 'kind', p_kind,
                              'reason', 'module_inactive', 'used', 0, 'limit', null, 'pct', null);
  end if;

  if p_kind not in ('videos', 'storage', 'plays') then
    raise exception 'invalid kind';
  end if;

  if coalesce((select is_lifetime from public.stores where id = p_store_id), false) then
    return jsonb_build_object('allowed', true, 'level', 'ok', 'kind', p_kind,
                              'used', 0, 'limit', null, 'pct', null);
  end if;

  l := public._module_limits(p_store_id, 'vidlytics');

  if p_kind = 'videos' then
    select count(*) into v_used from vidlytics.vid_videos
     where store_id::text = p_store_id::text and coalesce(video_source_type, '') <> 'image';
    v_lim := (l ->> 'max_videos')::numeric;
  elsif p_kind = 'storage' then
    select coalesce(sum(file_size_bytes), 0) + coalesce((select builder_storage_bytes from public.stores where id = p_store_id), 0) into v_used from vidlytics.vid_videos
     where store_id::text = p_store_id::text;
    v_lim := (l ->> 'storage_gb')::numeric * 1073741824;
  else
    select count(*) into v_used
    from public.store_activity_events
    where store_id = p_store_id
      and event_type = 'video_view'
      and created_at >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
    v_lim := (l ->> 'views')::numeric;
  end if;

  v_used := v_used + coalesce(p_extra, 0);

  if v_lim is not null and v_lim > 0 then
    v_pct := round(v_used / v_lim * 100, 1);
    if p_kind = 'plays' then
      v_level := case when v_pct > 110 then 'blocked' when v_pct >= 100 then 'over'
                      when v_pct >= 80 then 'warn' else 'ok' end;
    else
      v_level := case when v_pct > 100 then 'blocked' when v_pct >= 80 then 'warn' else 'ok' end;
    end if;
  end if;

  return jsonb_build_object('allowed', v_level <> 'blocked', 'level', v_level, 'kind', p_kind,
                            'used', v_used, 'limit', v_lim, 'pct', v_pct);
end;
$function$;

-- 2) Upload (builder): lojas vitalicias sempre podem enviar
create or replace function public.store_can_upload(p_store uuid, p_bytes bigint)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case
    when not public.builder_user_store(p_store) then false
    when coalesce(s.is_lifetime, false) then true
    when s.storage_limit_bytes = 0 then true
    else coalesce(s.storage_used_bytes,0) + coalesce(s.builder_storage_bytes,0) + p_bytes
         <= coalesce(s.storage_limit_bytes, 104857600)
  end
  from public.stores s
  where s.id = p_store
$function$;

-- 3) Sync de limites: nao sobrescreve lojas vitalicias
create or replace function public.sync_store_limits(p_store_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  l jsonb;
  bytes bigint;
begin
  if coalesce((select is_lifetime from public.stores where id = p_store_id), false) then
    return;
  end if;
  l := public._module_limits(p_store_id, 'vidlytics');
  if l is null or jsonb_typeof(l -> 'storage_gb') <> 'number' then return; end if;
  bytes := round((l ->> 'storage_gb')::numeric * 1073741824)::bigint;
  update public.stores
     set storage_limit_bytes = bytes, updated_at = now()
   where id = p_store_id and storage_limit_bytes is distinct from bytes;
end;
$function$;

-- 4) Gate: sem limite de campanhas para lojas vitalicias
create or replace function gate.enforce_max_gates()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'gate'
as $function$
begin
  if coalesce((select is_lifetime from public.stores where id = new.store_id), false) then
    return new;
  end if;
  if (select count(*) from gate.gates where store_id = new.store_id)
     >= (select coalesce(max_gates, 1) from public.stores where id = new.store_id) then
    raise exception 'Limite de campanhas atingido para esta loja';
  end if;
  return new;
end $function$;

-- Reaplica os valores da Use Anny (caso algum sync tenha mexido)
update public.stores
set max_gates = 999999,
    max_custom_domains = 999999,
    storage_limit_bytes = 10995116277760,
    updated_at = now()
where is_lifetime = true;
