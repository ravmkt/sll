-- Remove a trava antiga (tabela errada)
drop trigger if exists trg_videos_quota on public.videos;
drop function if exists public.trg_enforce_video_quota();

-- Contagem de videos e storage a partir de vidlytics.vid_videos
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
    select coalesce(sum(views_count), 0) into v_used
    from public.daily_video_metrics
    where store_id::text = p_store_id::text
      and "date" >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
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

-- Trava no servidor: vale para upload, URL externa, Instagram, TikTok e Yampi
create or replace function vidlytics.trg_enforce_vid_quota()
returns trigger
language plpgsql
security definer
set search_path = public, vidlytics
as $$
declare
  q jsonb;
  sid uuid;
begin
  if new.store_id is null then return new; end if;
  sid := new.store_id::text::uuid;

  if coalesce(new.video_source_type, '') <> 'image' then
    q := public._quota_state(sid, 'videos', 1);
    if not (q ->> 'allowed')::boolean then
      raise exception 'QUOTA_EXCEEDED:%', coalesce(q ->> 'reason', q ->> 'kind');
    end if;
  end if;

  if coalesce(new.file_size_bytes, 0) > 0 then
    q := public._quota_state(sid, 'storage', new.file_size_bytes);
    if not (q ->> 'allowed')::boolean then
      raise exception 'QUOTA_EXCEEDED:%', coalesce(q ->> 'reason', q ->> 'kind');
    end if;
  end if;
  return new;
end;
$$;

revoke all on function vidlytics.trg_enforce_vid_quota() from public, anon, authenticated;

drop trigger if exists trg_vid_videos_quota on vidlytics.vid_videos;
create trigger trg_vid_videos_quota
  before insert on vidlytics.vid_videos
  for each row execute function vidlytics.trg_enforce_vid_quota();

-- Conferencia
select s.name, public._quota_state(s.id, 'videos', 0) as videos, public._quota_state(s.id, 'storage', 0) as storage
from public.stores s order by s.name;