-- NPS com varias pesquisas e perguntas livres
create table if not exists public.nps_surveys (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nova pesquisa',
  enabled boolean not null default false,
  invite_title text not null default 'Como está sendo sua experiência com o SLL?',
  invite_text text not null default 'Leva menos de 1 minuto.',
  min_days_after_signup int not null default 0,
  cooldown_days int not null default 90,
  dismiss_days int not null default 30,
  target text not null default 'all' check (target in ('all','stores')),
  store_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nps_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.nps_surveys(id) on delete cascade,
  sort_order int not null default 0,
  type text not null check (type in ('nps','single','multi','text')),
  title text not null,
  required boolean not null default false,
  placeholder text,
  allow_other boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  legacy_key text
);
create index if not exists nps_questions_survey_idx on public.nps_questions(survey_id, sort_order);

create table if not exists public.nps_survey_dismissals (
  survey_id uuid not null references public.nps_surveys(id) on delete cascade,
  user_id uuid not null,
  store_id uuid not null,
  dismissed_until timestamptz not null,
  primary key (survey_id, user_id, store_id)
);

alter table public.nps_surveys enable row level security;
alter table public.nps_questions enable row level security;
alter table public.nps_survey_dismissals enable row level security;

-- Migra o NPS atual para a primeira pesquisa
do $mig$
declare
  c public.admin_nps_config; v_id uuid;
  v_inv text; v_qs text; v_qp text; v_qf text; v_qc text; v_ph text;
  v_pains jsonb; v_feats jsonb; v_other boolean;
begin
  if exists (select 1 from public.nps_surveys) then return; end if;
  select * into c from public.admin_nps_config limit 1;

  v_inv := coalesce(nullif(btrim((select value from public.admin_nps_texts where key = 'invite_title')), ''), 'Como está sendo sua experiência com o SLL?');
  v_qs  := coalesce(nullif(btrim((select value from public.admin_nps_texts where key = 'score_question')), ''), 'De 0 a 10, o quanto você recomendaria o SLL a outro lojista?');
  v_qp  := coalesce(nullif(btrim((select value from public.admin_nps_texts where key = 'pain_title')), ''), 'Qual tem sido a sua maior dificuldade?');
  v_qf  := coalesce(nullif(btrim((select value from public.admin_nps_texts where key = 'feature_title')), ''), 'Qual recurso mais gera resultado?');
  v_qc  := coalesce(nullif(btrim((select value from public.admin_nps_texts where key = 'comment_question')), ''), 'Quer deixar algum comentário? (opcional)');
  v_ph  := coalesce(nullif(btrim((select value from public.admin_nps_texts where key = 'comment_placeholder')), ''), 'O que podemos melhorar?');

  v_pains := coalesce((select jsonb_agg(jsonb_build_object('key', key, 'label', label) order by sort_order)
                       from public.admin_nps_options where kind = 'pain' and active and key <> 'outro'), '[]'::jsonb);
  v_other := exists (select 1 from public.admin_nps_options where kind = 'pain' and active and key = 'outro');
  v_feats := coalesce((select jsonb_agg(jsonb_build_object('key', key, 'label', label) order by sort_order)
                       from public.admin_nps_options where kind = 'feature' and active), '[]'::jsonb);

  if v_pains = '[]'::jsonb then
    v_pains := '[{"key":"dificuldade_instalacao","label":"Dificuldade na instalação"},{"key":"poucos_recursos","label":"Faltam funcionalidades"},{"key":"preco","label":"Preço"},{"key":"desempenho","label":"Desempenho / lentidão"},{"key":"suporte","label":"Suporte"}]'::jsonb;
    v_other := true;
  end if;
  if v_feats = '[]'::jsonb then
    v_feats := '[{"key":"vidlytics","label":"Vidlytics (vídeos)"},{"key":"live_commerce","label":"Live Commerce"},{"key":"analytics","label":"Analytics"},{"key":"noah","label":"Noah (assistente)"},{"key":"widgets","label":"Widgets"}]'::jsonb;
  end if;

  insert into public.nps_surveys (name, enabled, invite_title, invite_text, min_days_after_signup, cooldown_days, dismiss_days, target, store_ids)
  values ('NPS padrão', coalesce(c.enabled, true), v_inv, 'Leva menos de 1 minuto.',
          coalesce(c.min_days_after_signup, 0), coalesce(c.cooldown_days, 90), coalesce(c.dismiss_days, 30),
          coalesce(c.target, 'all'), coalesce(c.store_ids, '{}'))
  returning id into v_id;

  insert into public.nps_questions (survey_id, sort_order, type, title, required, placeholder, allow_other, options, legacy_key) values
    (v_id, 1, 'nps',    v_qs, true,  null, false,   '[]'::jsonb, 'score'),
    (v_id, 2, 'single', v_qp, false, null, v_other, v_pains,     'main_pain'),
    (v_id, 3, 'single', v_qf, false, null, false,   v_feats,     'top_feature'),
    (v_id, 4, 'text',   v_qc, false, v_ph, false,   '[]'::jsonb, 'comment');

  update public.app_feedbacks
     set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('survey_id', v_id)
   where type = 'nps_wizard' and not (coalesce(payload, '{}'::jsonb) ? 'survey_id');

  insert into public.nps_survey_dismissals (survey_id, user_id, store_id, dismissed_until)
  select v_id, user_id, store_id, dismissed_until from public.app_feedback_dismissals
   where dismissed_until > now()
  on conflict do nothing;
end $mig$;

-- ADMIN: listar pesquisas com perguntas
create or replace function public.admin_nps_list_surveys()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(
      to_jsonb(s) || jsonb_build_object(
        'responses_count', (select count(*) from public.app_feedbacks f where f.type = 'nps_wizard' and f.payload->>'survey_id' = s.id::text),
        'questions', coalesce((select jsonb_agg(to_jsonb(q) - 'survey_id' order by q.sort_order)
                               from public.nps_questions q where q.survey_id = s.id), '[]'::jsonb))
      order by s.created_at)
    from public.nps_surveys s), '[]'::jsonb);
end $$;

-- ADMIN: salvar pesquisa + perguntas
create or replace function public.admin_nps_save_survey(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; q jsonb; i int := 0; v_keep uuid[] := '{}'; v_qid uuid;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if btrim(coalesce(p->>'name', '')) = '' then raise exception 'name_required'; end if;
  v_id := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());

  insert into public.nps_surveys (id, name, enabled, invite_title, invite_text, min_days_after_signup, cooldown_days, dismiss_days, target, store_ids)
  values (v_id, left(btrim(p->>'name'), 80), coalesce((p->>'enabled')::boolean, false),
          left(coalesce(nullif(btrim(p->>'invite_title'), ''), 'Como está sendo sua experiência com o SLL?'), 120),
          left(coalesce(p->>'invite_text', ''), 160),
          greatest(coalesce((p->>'min_days_after_signup')::int, 0), 0),
          least(greatest(coalesce((p->>'cooldown_days')::int, 90), 1), 730),
          least(greatest(coalesce((p->>'dismiss_days')::int, 30), 1), 365),
          case when p->>'target' = 'stores' then 'stores' else 'all' end,
          coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p->'store_ids', '[]'::jsonb)) x), '{}'))
  on conflict (id) do update set
    name = excluded.name, enabled = excluded.enabled, invite_title = excluded.invite_title,
    invite_text = excluded.invite_text, min_days_after_signup = excluded.min_days_after_signup,
    cooldown_days = excluded.cooldown_days, dismiss_days = excluded.dismiss_days,
    target = excluded.target, store_ids = excluded.store_ids, updated_at = now();

  for q in select value from jsonb_array_elements(coalesce(p->'questions', '[]'::jsonb)) loop
    i := i + 1;
    if q->>'type' not in ('nps','single','multi','text') then raise exception 'invalid_type'; end if;
    if btrim(coalesce(q->>'title', '')) = '' then raise exception 'question_title_required'; end if;
    v_qid := coalesce(nullif(q->>'id', '')::uuid, gen_random_uuid());
    insert into public.nps_questions (id, survey_id, sort_order, type, title, required, placeholder, allow_other, options, legacy_key)
    values (v_qid, v_id, i, q->>'type', left(btrim(q->>'title'), 200),
            coalesce((q->>'required')::boolean, false),
            nullif(left(coalesce(q->>'placeholder', ''), 120), ''),
            coalesce((q->>'allow_other')::boolean, false) and (q->>'type' in ('single','multi')),
            case when q->>'type' in ('single','multi') and jsonb_typeof(q->'options') = 'array' then q->'options' else '[]'::jsonb end,
            nullif(q->>'legacy_key', ''))
    on conflict (id) do update set
      sort_order = excluded.sort_order, type = excluded.type, title = excluded.title,
      required = excluded.required, placeholder = excluded.placeholder,
      allow_other = excluded.allow_other, options = excluded.options, legacy_key = excluded.legacy_key
      where public.nps_questions.survey_id = excluded.survey_id;
    v_keep := v_keep || v_qid;
  end loop;

  delete from public.nps_questions where survey_id = v_id and not (id = any(v_keep));
  return v_id;
end $$;

create or replace function public.admin_nps_delete_survey(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  delete from public.nps_surveys where id = p_id;
end $$;

-- LOJA: qual pesquisa mostrar
create or replace function public.feedback_wizard_status(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_created timestamptz; v_days int; s public.nps_surveys; v_q jsonb;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  select created_at into v_created from public.stores where id = p_store_id;
  v_days := floor(extract(epoch from (now() - v_created)) / 86400)::int;

  select * into s from public.nps_surveys x
   where x.enabled
     and (x.target = 'all' or p_store_id = any(x.store_ids))
     and v_days >= x.min_days_after_signup
     and exists (select 1 from public.nps_questions q where q.survey_id = x.id)
     and not exists (select 1 from public.app_feedbacks f
                      where f.store_id = p_store_id and f.type = 'nps_wizard'
                        and f.payload->>'survey_id' = x.id::text
                        and f.created_at > now() - make_interval(days => x.cooldown_days))
     and not exists (select 1 from public.nps_survey_dismissals d
                      where d.survey_id = x.id and d.user_id = auth.uid()
                        and d.store_id = p_store_id and d.dismissed_until > now())
   order by x.min_days_after_signup desc, x.created_at
   limit 1;

  if s.id is null then
    return jsonb_build_object('should_show', false, 'reason', 'no_eligible', 'days_since_signup', v_days, 'survey', null);
  end if;

  select jsonb_agg(jsonb_build_object('id', q.id, 'type', q.type, 'title', q.title, 'required', q.required,
                                      'placeholder', q.placeholder, 'allow_other', q.allow_other, 'options', q.options)
                   order by q.sort_order)
    into v_q from public.nps_questions q where q.survey_id = s.id;

  return jsonb_build_object('should_show', true, 'reason', 'eligible', 'days_since_signup', v_days,
    'survey', jsonb_build_object('id', s.id, 'invite_title', s.invite_title, 'invite_text', s.invite_text, 'questions', v_q));
end $$;

create or replace function public.feedback_dismiss_survey(p_store_id uuid, p_survey_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_days int;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  select dismiss_days into v_days from public.nps_surveys where id = p_survey_id;
  insert into public.nps_survey_dismissals (survey_id, user_id, store_id, dismissed_until)
  values (p_survey_id, auth.uid(), p_store_id, now() + make_interval(days => coalesce(v_days, 30)))
  on conflict (survey_id, user_id, store_id) do update set dismissed_until = excluded.dismissed_until;
end $$;

-- LOJA: enviar respostas (valida tudo no servidor)
create or replace function public.submit_nps_survey(p_store_id uuid, p_survey_id uuid, p_answers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  s public.nps_surveys; q public.nps_questions; a jsonb; v_id uuid;
  v_score int; v_comment text;
  v_payload jsonb := '{}'::jsonb; v_snap jsonb := '[]'::jsonb;
  v_val text; v_other text; v_keys text[]; v_labels text[]; k text; v_label text;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  select * into s from public.nps_surveys where id = p_survey_id and enabled;
  if s.id is null then raise exception 'survey_not_found'; end if;
  if exists (select 1 from public.app_feedbacks f
              where f.store_id = p_store_id and f.type = 'nps_wizard'
                and f.payload->>'survey_id' = s.id::text
                and f.created_at > now() - make_interval(days => s.cooldown_days)) then
    raise exception 'already_answered_recently';
  end if;

  for q in select * from public.nps_questions where survey_id = s.id order by sort_order loop
    a := null;
    select e into a from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) e
     where e->>'question_id' = q.id::text limit 1;

    if q.type = 'nps' then
      v_val := a->>'value';
      if v_val is null or v_val !~ '^[0-9]{1,2}$' then
        if q.required then raise exception 'missing_answer'; end if;
        continue;
      end if;
      if v_val::int > 10 then raise exception 'invalid_score'; end if;
      if v_score is null then v_score := v_val::int; end if;
      v_snap := v_snap || jsonb_build_object('question_id', q.id, 'type', 'nps', 'title', q.title, 'value', v_val::int);

    elsif q.type = 'text' then
      v_val := nullif(left(btrim(coalesce(a->>'value', '')), 2000), '');
      if v_val is null then
        if q.required then raise exception 'missing_answer'; end if;
        continue;
      end if;
      if q.legacy_key = 'comment' then v_comment := v_val; end if;
      v_snap := v_snap || jsonb_build_object('question_id', q.id, 'type', 'text', 'title', q.title, 'value', v_val);

    else
      if q.type = 'single' then
        v_keys := case when nullif(a->>'value', '') is null then '{}'::text[] else array[a->>'value'] end;
      else
        v_keys := coalesce((select array_agg(x) from jsonb_array_elements_text(
                    case when jsonb_typeof(a->'value') = 'array' then a->'value' else '[]'::jsonb end) x), '{}'::text[]);
      end if;
      if cardinality(v_keys) = 0 then
        if q.required then raise exception 'missing_answer'; end if;
        continue;
      end if;
      v_labels := '{}'::text[];
      foreach k in array v_keys loop
        v_label := null;
        if k = 'outro' and q.allow_other then
          v_label := 'Outro';
        else
          select o->>'label' into v_label from jsonb_array_elements(q.options) o where o->>'key' = k limit 1;
        end if;
        if v_label is null then raise exception 'invalid_option'; end if;
        v_labels := v_labels || v_label;
      end loop;
      v_other := case when 'outro' = any(v_keys) and q.allow_other
                      then nullif(left(btrim(coalesce(a->>'other', '')), 300), '') end;
      v_snap := v_snap || jsonb_build_object('question_id', q.id, 'type', q.type, 'title', q.title,
                          'keys', to_jsonb(v_keys), 'labels', to_jsonb(v_labels), 'other', v_other);
      if q.legacy_key is not null and q.type = 'single' then
        v_payload := v_payload || jsonb_build_object(q.legacy_key, v_keys[1]);
        if q.legacy_key = 'main_pain' and v_other is not null then
          v_payload := v_payload || jsonb_build_object('main_pain_other', v_other);
        end if;
      end if;
    end if;
  end loop;

  v_payload := v_payload || jsonb_build_object('survey_id', s.id, 'answers', v_snap);
  insert into public.app_feedbacks (store_id, user_id, type, score, payload, comment)
  values (p_store_id, auth.uid(), 'nps_wizard', v_score, v_payload, v_comment)
  returning id into v_id;
  return v_id;
end $$;

-- ADMIN: resultados e respostas, com filtro opcional por pesquisa
drop function if exists public.admin_nps_results(integer);
drop function if exists public.admin_nps_responses(integer);

create or replace function public.admin_nps_results(p_days int default 90, p_survey_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 90), 1));
  v_total int; v_prom int; v_pas int; v_det int;
  v_dist jsonb; v_pains jsonb; v_feats jsonb; v_comments jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select count(score), count(*) filter (where score >= 9),
         count(*) filter (where score between 7 and 8), count(*) filter (where score <= 6)
    into v_total, v_prom, v_pas, v_det
  from public.app_feedbacks
  where type = 'nps_wizard' and created_at >= v_since
    and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text);

  select coalesce(jsonb_agg(jsonb_build_object('score', g, 'count', coalesce(c.n, 0)) order by g), '[]'::jsonb)
    into v_dist
  from generate_series(0, 10) g
  left join (select score, count(*) n from public.app_feedbacks
             where type = 'nps_wizard' and created_at >= v_since and score is not null
               and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text)
             group by score) c on c.score = g;

  select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb) into v_pains
  from (select payload->>'main_pain' k, count(*) n from public.app_feedbacks
        where type = 'nps_wizard' and created_at >= v_since and payload ? 'main_pain'
          and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text) group by 1) t;

  select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb) into v_feats
  from (select payload->>'top_feature' k, count(*) n from public.app_feedbacks
        where type = 'nps_wizard' and created_at >= v_since and payload ? 'top_feature'
          and (p_survey_id is null or payload->>'survey_id' = p_survey_id::text) group by 1) t;

  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into v_comments
  from (select jsonb_build_object('store', s.name, 'score', f.score, 'comment', f.comment,
               'pain_other', f.payload->>'main_pain_other', 'created_at', f.created_at) x
        from public.app_feedbacks f left join public.stores s on s.id = f.store_id
        where f.type = 'nps_wizard' and f.created_at >= v_since
          and (p_survey_id is null or f.payload->>'survey_id' = p_survey_id::text)
          and (f.comment is not null or f.payload ? 'main_pain_other')
        order by f.created_at desc limit 50) t;

  return jsonb_build_object(
    'total', v_total, 'promoters', v_prom, 'passives', v_pas, 'detractors', v_det,
    'nps', case when v_total = 0 then null else round(100.0 * (v_prom - v_det) / v_total)::int end,
    'distribution', v_dist, 'pains', v_pains, 'features', v_feats, 'comments', v_comments);
end $$;

create or replace function public.admin_nps_responses(p_days int default 90, p_survey_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
      select f.id, f.created_at, f.score, f.comment, f.payload,
        s.id as store_id, s.name as store_name, s.contact_name::text as contact_name,
        u.email::text as user_email,
        coalesce(nullif(s.contact_email::text,''), nullif(s.owner_contact_email::text,''),
                 nullif(s.store_email::text,''), nullif(s.manager_email::text,''), u.email::text) as email,
        coalesce(nullif(s.whatsapp::text,''), nullif(s.store_whatsapp::text,''),
                 nullif(s.manager_whatsapp::text,''), nullif(s.manager_phone::text,'')) as whatsapp,
        (select sv.name from public.nps_surveys sv where sv.id::text = f.payload->>'survey_id') as survey_name
      from public.app_feedbacks f
      join public.stores s on s.id = f.store_id
      left join auth.users u on u.id = f.user_id
      where f.type = 'nps_wizard'
        and f.created_at >= now() - make_interval(days => greatest(p_days, 1))
        and (p_survey_id is null or f.payload->>'survey_id' = p_survey_id::text)
      order by f.created_at desc
      limit 500
    ) r
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_nps_reset_store(p_store_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  delete from public.app_feedback_dismissals where store_id = p_store_id;
  delete from public.nps_survey_dismissals where store_id = p_store_id;
  delete from public.app_feedbacks where store_id = p_store_id and type = 'nps_wizard';
  get diagnostics n = row_count;
  return n;
end $$;

-- permissoes
revoke all on function public.admin_nps_list_surveys() from public, anon;
revoke all on function public.admin_nps_save_survey(jsonb) from public, anon;
revoke all on function public.admin_nps_delete_survey(uuid) from public, anon;
revoke all on function public.admin_nps_results(int, uuid) from public, anon;
revoke all on function public.admin_nps_responses(int, uuid) from public, anon;
revoke all on function public.admin_nps_reset_store(uuid) from public, anon;
revoke all on function public.feedback_wizard_status(uuid) from public, anon;
revoke all on function public.feedback_dismiss_survey(uuid, uuid) from public, anon;
revoke all on function public.submit_nps_survey(uuid, uuid, jsonb) from public, anon;
grant execute on function public.admin_nps_list_surveys() to authenticated;
grant execute on function public.admin_nps_save_survey(jsonb) to authenticated;
grant execute on function public.admin_nps_delete_survey(uuid) to authenticated;
grant execute on function public.admin_nps_results(int, uuid) to authenticated;
grant execute on function public.admin_nps_responses(int, uuid) to authenticated;
grant execute on function public.admin_nps_reset_store(uuid) to authenticated;
grant execute on function public.feedback_wizard_status(uuid) to authenticated;
grant execute on function public.feedback_dismiss_survey(uuid, uuid) to authenticated;
grant execute on function public.submit_nps_survey(uuid, uuid, jsonb) to authenticated;