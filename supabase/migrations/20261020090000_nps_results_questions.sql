create or replace function public.admin_nps_results(p_days integer default 90, p_survey_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 90), 1));
  v_total int; v_prom int; v_pas int; v_det int;
  v_dist jsonb; v_pains jsonb; v_feats jsonb; v_comments jsonb; v_questions jsonb;
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

  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'total', tot, 'items', items) order by title), '[]'::jsonb)
    into v_questions
  from (
    select t.title, sum(t.n) as tot,
           jsonb_agg(jsonb_build_object('key', t.label, 'count', t.n) order by t.n desc) as items
    from (
      select a->>'title' as title, lb.label, count(*) as n
      from public.app_feedbacks f
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(f.payload->'answers') = 'array' then f.payload->'answers' else '[]'::jsonb end) a
      cross join lateral jsonb_array_elements_text(
        case when jsonb_typeof(a->'labels') = 'array' then a->'labels' else '[]'::jsonb end) as lb(label)
      where f.type = 'nps_wizard' and f.created_at >= v_since
        and a->>'type' in ('single', 'multi')
        and (p_survey_id is null or f.payload->>'survey_id' = p_survey_id::text)
      group by 1, 2
    ) t
    group by t.title
  ) q;

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
    'distribution', v_dist, 'pains', v_pains, 'features', v_feats,
    'questions', v_questions, 'comments', v_comments);
end $function$;