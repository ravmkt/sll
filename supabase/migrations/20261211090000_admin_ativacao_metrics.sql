create or replace function public.admin_ativacao_metrics(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden';

  with b as (
    select s.id, s.name, s.created_at,
           coalesce(s.onboarding_completed, false) as f_onb,
           coalesce(s.script_verified, false) as f_script,
           v.t as t_video, l.t as t_live, c.t as t_sale
    from public.stores s
    left join (select store_id, min(created_at) as t from vidlytics.vid_videos group by 1) v on v.store_id = s.id
    left join (select store_id, min(started_at) as t from live_commerce.lives where started_at is not null group by 1) l on l.store_id = s.id
    left join (select store_id, min(created_at) as t from public.sll_conversions where status = 'paid' group by 1) c on c.store_id = s.id
    where coalesce(s.is_sandbox, false) = false
      and s.created_at::date between p_start and p_end
  )
  select jsonb_build_object(
    'total', count(*),
    'etapas', jsonb_build_array(
      jsonb_build_object('key', 'cadastro',   'n', count(*),                                'dias', null),
      jsonb_build_object('key', 'onboarding', 'n', count(*) filter (where f_onb),           'dias', null),
      jsonb_build_object('key', 'script',     'n', count(*) filter (where f_script),        'dias', null),
      jsonb_build_object('key', 'video',      'n', count(*) filter (where t_video is not null),
        'dias', round(avg(extract(epoch from (t_video - created_at)) / 86400.0)::numeric, 1)),
      jsonb_build_object('key', 'live',       'n', count(*) filter (where t_live is not null),
        'dias', round(avg(extract(epoch from (t_live - created_at)) / 86400.0)::numeric, 1)),
      jsonb_build_object('key', 'venda',      'n', count(*) filter (where t_sale is not null),
        'dias', round(avg(extract(epoch from (t_sale - created_at)) / 86400.0)::numeric, 1))
    ),
    'travadas', coalesce((
      select jsonb_agg(x order by x.created_at)
      from (
        select id, name, created_at,
               case
                 when not f_onb then 'onboarding'
                 when not f_script then 'script'
                 when t_video is null then 'video'
                 when t_live is null then 'live'
                 when t_sale is null then 'venda'
               end as next
        from b
        where created_at < now() - interval '48 hours'
          and (not f_onb or not f_script or t_video is null or t_live is null or t_sale is null)
        order by created_at
        limit 50
      ) x
    ), '[]'::jsonb)
  ) into v_res
  from b;

  return v_res;
end;
$$;

revoke all on function public.admin_ativacao_metrics(date, date) from public, anon;
grant execute on function public.admin_ativacao_metrics(date, date) to authenticated;