-- Configuracao do NPS (linha unica)
create table if not exists public.admin_nps_config (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  min_days_after_signup int not null default 0 check (min_days_after_signup >= 0),
  cooldown_days int not null default 90 check (cooldown_days between 1 and 730),
  dismiss_days int not null default 30 check (dismiss_days between 1 and 365),
  target text not null default 'all' check (target in ('all','stores')),
  store_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.admin_nps_config (id) values (true) on conflict (id) do nothing;
alter table public.admin_nps_config enable row level security;
revoke all on public.admin_nps_config from anon, authenticated;

create or replace function public.admin_nps_get_config()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select to_jsonb(c) - 'id' into v from public.admin_nps_config c limit 1;
  return v;
end $$;

create or replace function public.admin_nps_save_config(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  update public.admin_nps_config set
    enabled = coalesce((p->>'enabled')::boolean, enabled),
    min_days_after_signup = greatest(coalesce((p->>'min_days_after_signup')::int, min_days_after_signup), 0),
    cooldown_days = least(greatest(coalesce((p->>'cooldown_days')::int, cooldown_days), 1), 730),
    dismiss_days = least(greatest(coalesce((p->>'dismiss_days')::int, dismiss_days), 1), 365),
    target = case when p->>'target' in ('all','stores') then p->>'target' else target end,
    store_ids = coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p->'store_ids') x), store_ids),
    updated_at = now()
  where id;
end $$;

-- Status do wizard lendo a configuracao
create or replace function public.feedback_wizard_status(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.admin_nps_config;
  v_last timestamptz; v_dismissed timestamptz; v_created timestamptz;
  v_days int; v_show boolean; v_reason text;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  select * into c from public.admin_nps_config limit 1;
  select max(created_at) into v_last from public.app_feedbacks
    where store_id = p_store_id and type = 'nps_wizard';
  select dismissed_until into v_dismissed from public.app_feedback_dismissals
    where user_id = auth.uid() and store_id = p_store_id;
  select created_at into v_created from public.stores where id = p_store_id;
  v_days := floor(extract(epoch from (now() - v_created)) / 86400)::int;

  if not c.enabled then
    v_show := false; v_reason := 'disabled';
  elsif c.target = 'stores' and not (p_store_id = any(c.store_ids)) then
    v_show := false; v_reason := 'not_targeted';
  elsif v_days < c.min_days_after_signup then
    v_show := false; v_reason := 'too_new';
  elsif v_last is not null and v_last > now() - make_interval(days => c.cooldown_days) then
    v_show := false; v_reason := 'answered_recently';
  elsif v_dismissed is not null and v_dismissed > now() then
    v_show := false; v_reason := 'dismissed';
  else
    v_show := true; v_reason := 'eligible';
  end if;

  return jsonb_build_object('should_show', v_show, 'reason', v_reason, 'days_since_signup', v_days);
end $$;

create or replace function public.feedback_dismiss_wizard(p_store_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_days int;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  select dismiss_days into v_days from public.admin_nps_config limit 1;
  insert into public.app_feedback_dismissals (user_id, store_id, dismissed_until)
  values (auth.uid(), p_store_id, now() + make_interval(days => coalesce(v_days, 30)))
  on conflict (user_id, store_id) do update set dismissed_until = excluded.dismissed_until;
end $$;

create or replace function public.submit_nps_wizard(
  p_store_id uuid, p_score int, p_payload jsonb default '{}'::jsonb, p_comment text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_payload jsonb; v_cool int;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  if p_score is null or p_score < 0 or p_score > 10 then
    raise exception 'invalid_score';
  end if;
  select cooldown_days into v_cool from public.admin_nps_config limit 1;
  if exists (select 1 from public.app_feedbacks
             where store_id = p_store_id and type = 'nps_wizard'
               and created_at > now() - make_interval(days => coalesce(v_cool, 90))) then
    raise exception 'already_answered_recently';
  end if;

  v_payload := jsonb_strip_nulls(jsonb_build_object(
    'top_feature', left(p_payload->>'top_feature', 40),
    'main_pain', left(p_payload->>'main_pain', 40),
    'main_pain_other', left(p_payload->>'main_pain_other', 300)
  ));

  insert into public.app_feedbacks (store_id, user_id, type, score, payload, comment)
  values (p_store_id, auth.uid(), 'nps_wizard', p_score, v_payload,
          nullif(left(btrim(coalesce(p_comment, '')), 2000), ''))
  returning id into v_id;
  return v_id;
end $$;

-- Resultados do NPS para o Master
create or replace function public.admin_nps_results(p_days int default 90)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 90), 1));
  v_total int; v_prom int; v_pas int; v_det int;
  v_dist jsonb; v_pains jsonb; v_feats jsonb; v_comments jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select count(*), count(*) filter (where score >= 9),
         count(*) filter (where score between 7 and 8), count(*) filter (where score <= 6)
    into v_total, v_prom, v_pas, v_det
  from public.app_feedbacks where type = 'nps_wizard' and created_at >= v_since;

  select coalesce(jsonb_agg(jsonb_build_object('score', g, 'count', coalesce(c.n, 0)) order by g), '[]'::jsonb)
    into v_dist
  from generate_series(0, 10) g
  left join (select score, count(*) n from public.app_feedbacks
             where type = 'nps_wizard' and created_at >= v_since group by score) c on c.score = g;

  select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb) into v_pains
  from (select payload->>'main_pain' k, count(*) n from public.app_feedbacks
        where type = 'nps_wizard' and created_at >= v_since and payload ? 'main_pain' group by 1) t;

  select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb) into v_feats
  from (select payload->>'top_feature' k, count(*) n from public.app_feedbacks
        where type = 'nps_wizard' and created_at >= v_since and payload ? 'top_feature' group by 1) t;

  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into v_comments
  from (select jsonb_build_object('store', s.name, 'score', f.score, 'comment', f.comment,
               'pain_other', f.payload->>'main_pain_other', 'created_at', f.created_at) x
        from public.app_feedbacks f left join public.stores s on s.id = f.store_id
        where f.type = 'nps_wizard' and f.created_at >= v_since
          and (f.comment is not null or f.payload ? 'main_pain_other')
        order by f.created_at desc limit 50) t;

  return jsonb_build_object(
    'total', v_total, 'promoters', v_prom, 'passives', v_pas, 'detractors', v_det,
    'nps', case when v_total = 0 then null else round(100.0 * (v_prom - v_det) / v_total)::int end,
    'distribution', v_dist, 'pains', v_pains, 'features', v_feats, 'comments', v_comments);
end $$;

-- Reiniciar NPS de uma loja (teste)
create or replace function public.admin_nps_reset_store(p_store_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  delete from public.app_feedback_dismissals where store_id = p_store_id;
  delete from public.app_feedbacks where store_id = p_store_id and type = 'nps_wizard';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.admin_nps_get_config() from public, anon;
revoke all on function public.admin_nps_save_config(jsonb) from public, anon;
revoke all on function public.admin_nps_results(int) from public, anon;
revoke all on function public.admin_nps_reset_store(uuid) from public, anon;
grant execute on function public.admin_nps_get_config() to authenticated;
grant execute on function public.admin_nps_save_config(jsonb) to authenticated;
grant execute on function public.admin_nps_results(int) to authenticated;
grant execute on function public.admin_nps_reset_store(uuid) to authenticated;