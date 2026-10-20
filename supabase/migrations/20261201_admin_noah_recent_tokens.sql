drop function if exists public.admin_noah_recent(integer);

create or replace function public.admin_noah_recent(p_limit integer default 50)
returns table (
  created_at timestamptz, store_name text, model text,
  prompt_tokens integer, completion_tokens integer, total_tokens integer,
  finish_reason text, user_message text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.noah_is_master() then raise exception 'FORBIDDEN'; end if;
  return query
    select l.created_at, coalesce(s.name, 'Sem loja'), l.model,
           l.prompt_tokens, l.completion_tokens, l.total_tokens,
           l.finish_reason, l.user_message
    from public.noah_logs l
    left join public.stores s on s.id = l.store_id
    order by l.created_at desc
    limit least(greatest(p_limit, 1), 200);
end $$;
grant execute on function public.admin_noah_recent(integer) to authenticated;

select proname from pg_proc where proname = 'admin_noah_recent';