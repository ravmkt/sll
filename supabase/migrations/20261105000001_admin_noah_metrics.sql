create or replace function public.admin_noah_feedback_metrics(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  r jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'up', count(*) filter (where vote = 'up'),
    'down', count(*) filter (where vote = 'down'),
    'total', count(*)
  ) into r
  from public.app_feedbacks
  where type = 'noah' and created_at >= v_from;

  r := r || jsonb_build_object('daily', coalesce((
    select jsonb_agg(to_jsonb(d) order by d.day)
    from (
      select (created_at at time zone 'America/Sao_Paulo')::date as day,
             count(*) filter (where vote = 'up') as up,
             count(*) filter (where vote = 'down') as down
      from public.app_feedbacks
      where type = 'noah' and created_at >= v_from
      group by 1
    ) d
  ), '[]'::jsonb));

  r := r || jsonb_build_object('downs', coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select f.created_at, f.store_id, to_jsonb(s)->>'name' as store_name,
             f.comment as question, f.reference_id
      from public.app_feedbacks f
      left join public.stores s on s.id = f.store_id
      where f.type = 'noah' and f.vote = 'down' and f.created_at >= v_from
      order by f.created_at desc
      limit 100
    ) x
  ), '[]'::jsonb));

  return r;
end $$;

revoke all on function public.admin_noah_feedback_metrics(int) from public;
grant execute on function public.admin_noah_feedback_metrics(int) to authenticated;