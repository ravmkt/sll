-- 20261114c_feedback_summary_tip_feedback.sql
create or replace function public.admin_master_feedback_summary(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1)); v jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'tips', (select jsonb_build_object(
        'up', count(*) filter (where vote = 1),
        'down', count(*) filter (where vote = -1),
        'implemented', count(*) filter (where implemented),
        'approval_pct', case when count(*) filter (where vote is not null) = 0 then null
          else round(100.0 * count(*) filter (where vote = 1) / count(*) filter (where vote is not null), 1) end)
      from public.tip_feedback where updated_at >= v_since),
    'noah', (select jsonb_build_object(
        'up', count(*) filter (where vote = 'up'),
        'down', count(*) filter (where vote = 'down'),
        'approval_pct', case when count(*) = 0 then null
          else round(100.0 * count(*) filter (where vote = 'up') / count(*), 1) end)
      from public.app_feedbacks where type = 'noah' and created_at >= v_since),
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
      from (select f.tip_id as reference_id, tp.title,
                   count(*) as total,
                   count(*) filter (where f.vote = -1) as down_votes,
                   round(100.0 * count(*) filter (where f.vote = -1) / count(*), 1) as down_pct
            from public.tip_feedback f
            join public.tips tp on tp.id = f.tip_id
            where f.vote is not null and f.updated_at >= v_since
            group by f.tip_id, tp.title
            having count(*) >= 5 and 100.0 * count(*) filter (where f.vote = -1) / count(*) > 50
            order by 5 desc limit 10) t), '[]'::jsonb),
    'suggestions', (select jsonb_build_object(
        'total', count(*),
        'unresolved', count(*) filter (where not resolved))
      from public.app_feedbacks where type = 'suggestion' and created_at >= v_since)
  ) into v;
  return v;
end $$;
