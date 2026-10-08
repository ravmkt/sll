create index if not exists idx_sae_store_event_created
  on public.store_activity_events (store_id, event_type, created_at);

create or replace function public._quota_state(p_store_id uuid, p_kind text, p_extra numeric default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
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

  l := public._module_limits(p_store_id, 'vidlytics');

  if p_kind = 'videos' then
    select count(*) into v_used from vidlytics.vid_videos
     where store_id::text = p_store_id::text and coalesce(video_source_type, '') <> 'image';
    v_lim := (l ->> 'max_videos')::numeric;
  elsif p_kind = 'storage' then
    select coalesce(sum(file_size_bytes), 0) into v_used from vidlytics.vid_videos
     where store_id::text = p_store_id::text;
    v_lim := (l ->> 'storage_gb')::numeric * 1073741824;
  elsif p_kind = 'plays' then
    select count(*) into v_used
    from public.store_activity_events
    where store_id = p_store_id
      and event_type = 'video_view'
      and created_at >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
    v_lim := (l ->> 'views')::numeric;
  else
    raise exception 'invalid kind';
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
$$;

-- Usada pelo widget (anon). true = pode exibir. So devolve false por excesso de plays (>110%).
create or replace function public.widget_play_allowed(p_store_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare q jsonb;
begin
  q := public._quota_state(p_store_id, 'plays', 0);
  if (q ->> 'reason') is not null then return true; end if;
  return coalesce((q ->> 'allowed')::boolean, true);
end;
$$;

revoke all on function public.widget_play_allowed(uuid) from public;
grant execute on function public.widget_play_allowed(uuid) to anon, authenticated;

-- Conferencia
select s.name, public._quota_state(s.id, 'plays', 0) as plays, public.widget_play_allowed(s.id) as widget_ok
from public.stores s order by s.name;