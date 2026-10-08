-- ===== Tolerancia de inadimplencia (3 dias, por assinatura) =====
alter table public.subscriptions add column if not exists past_due_since timestamptz;
update public.subscriptions set past_due_since = coalesce(updated_at, now())
 where status = 'past_due' and past_due_since is null;

create or replace function public.billing_grace_days() returns int
language sql immutable as $$ select 3 $$;

create or replace function public._sub_has_access(p_status text, p_since timestamptz) returns boolean
language sql stable as $$
  select p_status in ('active', 'trialing', 'lifetime')
      or (p_status = 'past_due'
          and coalesce(p_since, now()) > now() - make_interval(days => public.billing_grace_days()));
$$;

create or replace function public.trg_sub_past_due_since() returns trigger
language plpgsql as $$
begin
  if new.status = 'past_due' then
    if tg_op = 'INSERT' then
      new.past_due_since := now();
    elsif old.status is distinct from 'past_due' then
      new.past_due_since := now();
    else
      new.past_due_since := coalesce(old.past_due_since, now());
    end if;
  else
    new.past_due_since := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sub_past_due_since on public.subscriptions;
create trigger trg_sub_past_due_since
  before insert or update of status on public.subscriptions
  for each row execute function public.trg_sub_past_due_since();

-- ===== Limites por modulo (respeita a tolerancia) =====
create or replace function public._module_limits(p_store_id uuid, p_module text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
  a record;
  g record;
  v jsonb;
  best jsonb := null;
begin
  for r in
    select s.id, s.module_key, s.dynamic_plan_id, s.plan_id
    from public.subscriptions s
    where s.store_id = p_store_id
      and s.is_current = true
      and public._sub_has_access(s.status, s.past_due_since)
    order by (s.dynamic_plan_id is not null) desc, s.created_at desc
  loop
    v := null;
    if r.dynamic_plan_id is not null then
      select case
               when dp.is_combo then (
                 select pl.limits_config || coalesce(cm.limits_override, '{}'::jsonb)
                 from public.combo_modules cm
                 cross join lateral (
                   select x.limits_config from public.dynamic_plans x
                   where x.module_slug = cm.module_slug and not x.is_combo
                     and (cm.member_tier is null or x.plan_tier = cm.member_tier)
                   order by x.is_active desc, x.price_monthly_cents desc
                   limit 1
                 ) pl
                 where cm.plan_id = dp.id and cm.module_slug = p_module)
               when dp.module_slug = p_module then dp.limits_config
             end
        into v
      from public.dynamic_plans dp
      where dp.id = r.dynamic_plan_id;
    elsif r.plan_id is not null then
      select jsonb_build_object(
               'views', nullif(p.views_limit, 0),
               'max_videos', nullif(p.videos_limit, 0),
               'max_pages', nullif(p.pages_limit, 0),
               'storage_gb', case when coalesce(p.storage_limit_bytes, 0) = 0 then null
                                  else round(p.storage_limit_bytes / 1073741824.0, 2) end)
        into v
      from public.plans p
      where p.id = r.plan_id
        and (r.module_key = p_module
             or (coalesce(r.module_key, 'bundle') = 'bundle' and to_jsonb(p.modules) ? p_module));
    end if;

    if v is not null and best is null then best := v; end if;
  end loop;

  if best is null then return null; end if;

  for a in
    select ad.grants, sa.quantity
    from public.subscription_addons sa
    join public.plan_addons ad on ad.id = sa.addon_id
    join public.subscriptions s on s.id = sa.subscription_id
    where s.store_id = p_store_id
      and s.is_current = true
      and public._sub_has_access(s.status, s.past_due_since)
      and ad.module_slug = p_module
  loop
    for g in select key, value from jsonb_each_text(a.grants) loop
      if best ? g.key and jsonb_typeof(best -> g.key) = 'null' then continue; end if;
      best := best || jsonb_build_object(g.key, coalesce((best ->> g.key)::numeric, 0) + g.value::numeric * a.quantity);
    end loop;
  end loop;

  return best;
end;
$$;

-- ===== Modulos liberados (respeita a tolerancia) =====
create or replace function public.get_store_active_modules(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modules jsonb := '[]'::jsonb;
  v_store record;
begin
  select id, subscription_status, trial_ends_at, active
  into v_store
  from public.stores
  where id = p_store_id;

  if not found or v_store.active = false then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(distinct m), '[]'::jsonb) into v_modules
  from (
    select jsonb_array_elements_text(p.modules) as m
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.store_id = p_store_id
      and public._sub_has_access(s.status, s.past_due_since)
    union
    select s.module_key
    from public.subscriptions s
    where s.store_id = p_store_id
      and public._sub_has_access(s.status, s.past_due_since)
      and s.module_key is not null
      and s.module_key <> 'bundle'
    union
    select cm.module_slug
    from public.subscriptions s
    join public.combo_modules cm on cm.plan_id = s.dynamic_plan_id
    where s.store_id = p_store_id
      and public._sub_has_access(s.status, s.past_due_since)
    union
    select 'vidlytics'
    where v_store.subscription_status = 'trialing' and v_store.trial_ends_at > now()
  ) sub
  where m is not null;

  return v_modules;
end;
$$;

-- ===== Estado de cota: videos | storage | plays =====
-- ok < 80% | warn >= 80% | over 100-110% (so plays) | blocked: videos/storage > 100%, plays > 110%
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
    select count(*) into v_used from public.videos where store_id::text = p_store_id::text;
    v_lim := (l ->> 'max_videos')::numeric;
  elsif p_kind = 'storage' then
    select coalesce(storage_used_bytes, 0) into v_used from public.stores where id = p_store_id;
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

-- Pre-checagem do painel do lojista
create or replace function public.check_store_quota(p_store_id uuid, p_kind text, p_extra numeric default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_superadmin() or public.is_store_owner_or_member(p_store_id)) then
    return null;
  end if;
  return public._quota_state(p_store_id, p_kind, p_extra);
end;
$$;

-- Usado pelo widget publico: o player pode tocar?
create or replace function public.widget_play_allowed(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((public._quota_state(p_store_id, 'plays', 0) ->> 'allowed')::boolean, false);
$$;

-- ===== Trava no servidor: novo video =====
create or replace function public.trg_enforce_video_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q jsonb;
  bytes bigint;
begin
  q := public._quota_state(new.store_id, 'videos', 1);
  if not (q ->> 'allowed')::boolean then
    raise exception 'QUOTA_EXCEEDED:%', coalesce(q ->> 'reason', q ->> 'kind');
  end if;

  if new.video_source_type = 'upload' then
    bytes := coalesce(new.file_size, 0) + coalesce(new.thumbnail_file_size, 0);
    q := public._quota_state(new.store_id, 'storage', bytes);
    if not (q ->> 'allowed')::boolean then
      raise exception 'QUOTA_EXCEEDED:%', coalesce(q ->> 'reason', q ->> 'kind');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_videos_quota on public.videos;
create trigger trg_videos_quota
  before insert on public.videos
  for each row execute function public.trg_enforce_video_quota();

revoke all on function public._sub_has_access(text, timestamptz) from public, anon, authenticated;
revoke all on function public.billing_grace_days() from public, anon, authenticated;
revoke all on function public._quota_state(uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.check_store_quota(uuid, text, numeric) from public, anon;
grant execute on function public.check_store_quota(uuid, text, numeric) to authenticated;
grant execute on function public.widget_play_allowed(uuid) to anon, authenticated;

-- Conferencia: estado de cada loja
select s.name, s.subscription_status as status,
       public.get_store_active_modules(s.id) as modulos,
       public._quota_state(s.id, 'videos', 1) as novo_video,
       public._quota_state(s.id, 'storage', 0) as storage,
       public._quota_state(s.id, 'plays', 0) as plays
from public.stores s order by s.name;