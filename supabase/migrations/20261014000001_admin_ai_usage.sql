create or replace function public.admin_ai_usage(p_start date, p_end date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  a timestamptz := (p_start::timestamp at time zone 'America/Sao_Paulo');
  b timestamptz := ((p_end + 1)::timestamp at time zone 'America/Sao_Paulo');
  res jsonb;
begin
  if not public.is_superadmin() then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object(
    'calls', count(*),
    'prompt_tokens', coalesce(sum(prompt_tokens), 0),
    'completion_tokens', coalesce(sum(completion_tokens), 0),
    'total_tokens', coalesce(sum(total_tokens), 0),
    'stores', count(distinct store_id)
  ) into res
  from public.noah_logs
  where created_at >= a and created_at < b;

  return res || jsonb_build_object('top', coalesce((
    select jsonb_agg(t) from (
      select l.store_id as id, coalesce(s.name, 'Sem loja') as name, count(*) as calls,
             coalesce(sum(l.total_tokens), 0) as tokens,
             coalesce(sum(l.prompt_tokens), 0) as prompt_tokens,
             coalesce(sum(l.completion_tokens), 0) as completion_tokens
      from public.noah_logs l
      left join public.stores s on s.id = l.store_id
      where l.created_at >= a and l.created_at < b
      group by l.store_id, s.name
      order by sum(l.total_tokens) desc nulls last
      limit 8
    ) t), '[]'::jsonb));
end $$;
grant execute on function public.admin_ai_usage(date, date) to authenticated;

select proname from pg_proc where proname = 'admin_ai_usage';