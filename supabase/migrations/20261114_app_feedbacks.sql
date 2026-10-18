-- 20261114_app_feedbacks.sql
-- Feedbacks dos lojistas: dicas (voto), sugestoes, Noah e wizard NPS

create table if not exists public.app_feedbacks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('tip','suggestion','noah','nps_wizard')),
  reference_id text,
  vote text check (vote in ('up','down')),
  score smallint check (score between 0 and 10),
  payload jsonb not null default '{}'::jsonb,
  comment text check (char_length(comment) <= 2000),
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint app_feedbacks_shape check (
    (type in ('tip','noah') and vote is not null and reference_id is not null)
    or (type = 'nps_wizard' and score is not null)
    or (type = 'suggestion' and comment is not null and char_length(btrim(comment)) > 0)
  ),
  -- voto unico por usuario/tipo/referencia (NULLs nao colidem: wizard e sugestoes podem repetir)
  constraint app_feedbacks_unique_vote unique (user_id, type, reference_id)
);

create index if not exists app_feedbacks_store_created_idx on public.app_feedbacks (store_id, created_at desc);
create index if not exists app_feedbacks_type_created_idx on public.app_feedbacks (type, created_at desc);

alter table public.app_feedbacks enable row level security;

drop policy if exists app_feedbacks_select on public.app_feedbacks;
create policy app_feedbacks_select on public.app_feedbacks
  for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin());

drop policy if exists app_feedbacks_insert on public.app_feedbacks;
create policy app_feedbacks_insert on public.app_feedbacks
  for insert to authenticated
  with check (user_id = auth.uid() and type <> 'nps_wizard' and public.is_store_owner_or_member(store_id));

drop policy if exists app_feedbacks_update on public.app_feedbacks;
create policy app_feedbacks_update on public.app_feedbacks
  for update to authenticated
  using (user_id = auth.uid() and type in ('tip','noah'))
  with check (user_id = auth.uid() and type in ('tip','noah'));

-- lojista nao pode mexer em resolved/created_at
revoke all on public.app_feedbacks from anon;
revoke insert, update on public.app_feedbacks from authenticated;
grant insert (store_id, user_id, type, reference_id, vote, score, payload, comment) on public.app_feedbacks to authenticated;
grant update (vote, comment) on public.app_feedbacks to authenticated;

-- dispensas do wizard (acesso so via RPC)
create table if not exists public.app_feedback_dismissals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  dismissed_until timestamptz not null,
  primary key (user_id, store_id)
);
alter table public.app_feedback_dismissals enable row level security;
revoke all on public.app_feedback_dismissals from anon, authenticated;

-- status do wizard para o lojista
create or replace function public.feedback_wizard_status(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_last timestamptz; v_dismissed timestamptz; v_created timestamptz;
  v_show boolean; v_reason text;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  select max(created_at) into v_last from public.app_feedbacks
    where store_id = p_store_id and type = 'nps_wizard';
  select dismissed_until into v_dismissed from public.app_feedback_dismissals
    where user_id = auth.uid() and store_id = p_store_id;
  select created_at into v_created from public.stores where id = p_store_id;

  if v_last is not null and v_last > now() - interval '90 days' then
    v_show := false; v_reason := 'answered_recently';
  elsif v_dismissed is not null and v_dismissed > now() then
    v_show := false; v_reason := 'dismissed';
  else
    v_show := true; v_reason := 'eligible';
  end if;

  return jsonb_build_object(
    'should_show', v_show,
    'reason', v_reason,
    'days_since_signup', floor(extract(epoch from (now() - v_created)) / 86400)::int
  );
end $$;

-- dispensar por 30 dias
create or replace function public.feedback_dismiss_wizard(p_store_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  insert into public.app_feedback_dismissals (user_id, store_id, dismissed_until)
  values (auth.uid(), p_store_id, now() + interval '30 days')
  on conflict (user_id, store_id) do update set dismissed_until = excluded.dismissed_until;
end $$;

-- enviar wizard (valida nota, chaves permitidas e regra dos 90 dias)
create or replace function public.submit_nps_wizard(
  p_store_id uuid, p_score int, p_payload jsonb default '{}'::jsonb, p_comment text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_payload jsonb;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  if p_score is null or p_score < 0 or p_score > 10 then
    raise exception 'invalid_score';
  end if;
  if exists (select 1 from public.app_feedbacks
             where store_id = p_store_id and type = 'nps_wizard'
               and created_at > now() - interval '90 days') then
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

-- MASTER: resumo
create or replace function public.admin_master_feedback_summary(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1)); v jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'tips', (select jsonb_build_object(
        'up', count(*) filter (where vote = 'up'),
        'down', count(*) filter (where vote = 'down'),
        'approval_pct', case when count(*) = 0 then null
          else round(100.0 * count(*) filter (where vote = 'up') / count(*), 1) end)
      from public.app_feedbacks where type = 'tip' and created_at >= v_since),
    'nps', (select jsonb_build_object(
        'responses', count(*),
        'avg_score', round(avg(score), 1),
        'nps', case when count(*) = 0 then null
          else round(100.0 * (count(*) filter (where score >= 9) - count(*) filter (where score <= 6)) / count(*), 0) end)
      from public.app_feedbacks where type = 'nps_wizard' and created_at >= v_since),
    'main_pains', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc)
      from (select payload->>'main_pain' as k, count(*) as c from public.app_feedbacks
            where type = 'nps_wizard' and created_at >= v_since and payload ? 'main_pain'
            group by 1) t), '[]'::jsonb),
    'top_features', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc)
      from (select payload->>'top_feature' as k, count(*) as c from public.app_feedbacks
            where type = 'nps_wizard' and created_at >= v_since and payload ? 'top_feature'
            group by 1) t), '[]'::jsonb),
    'worst_tips', coalesce((select jsonb_agg(to_jsonb(t) order by t.down_pct desc)
      from (select reference_id, count(*) as total,
                   count(*) filter (where vote = 'down') as down_votes,
                   round(100.0 * count(*) filter (where vote = 'down') / count(*), 1) as down_pct
            from public.app_feedbacks
            where type = 'tip' and created_at >= v_since
            group by reference_id
            having count(*) >= 5 and 100.0 * count(*) filter (where vote = 'down') / count(*) > 50
            order by 4 desc limit 10) t), '[]'::jsonb),
    'suggestions', (select jsonb_build_object(
        'total', count(*),
        'unresolved', count(*) filter (where not resolved))
      from public.app_feedbacks where type = 'suggestion' and created_at >= v_since)
  ) into v;
  return v;
end $$;

-- MASTER: lista (feed)
create or replace function public.admin_master_feedback_list(
  p_type text default null, p_vote text default null,
  p_only_unresolved boolean default false, p_limit int default 50, p_offset int default 0
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) into v
  from (
    select f.id, f.store_id, s.name as store_name, f.type, f.reference_id, f.vote,
           f.score, f.payload, f.comment, f.resolved, f.created_at
    from public.app_feedbacks f
    join public.stores s on s.id = f.store_id
    where (p_type is null or f.type = p_type)
      and (p_vote is null or f.vote = p_vote)
      and (not p_only_unresolved or not f.resolved)
    order by f.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0)
  ) r;
  return v;
end $$;

-- MASTER: marcar como resolvido
create or replace function public.admin_master_feedback_resolve(p_id uuid, p_resolved boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  update public.app_feedbacks
     set resolved = p_resolved, resolved_at = case when p_resolved then now() else null end
   where id = p_id;
end $$;

revoke all on function public.feedback_wizard_status(uuid) from public, anon;
revoke all on function public.feedback_dismiss_wizard(uuid) from public, anon;
revoke all on function public.submit_nps_wizard(uuid, int, jsonb, text) from public, anon;
revoke all on function public.admin_master_feedback_summary(int) from public, anon;
revoke all on function public.admin_master_feedback_list(text, text, boolean, int, int) from public, anon;
revoke all on function public.admin_master_feedback_resolve(uuid, boolean) from public, anon;
grant execute on function public.feedback_wizard_status(uuid) to authenticated;
grant execute on function public.feedback_dismiss_wizard(uuid) to authenticated;
grant execute on function public.submit_nps_wizard(uuid, int, jsonb, text) to authenticated;
grant execute on function public.admin_master_feedback_summary(int) to authenticated;
grant execute on function public.admin_master_feedback_list(text, text, boolean, int, int) to authenticated;
grant execute on function public.admin_master_feedback_resolve(uuid, boolean) to authenticated;
