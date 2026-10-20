create or replace function public.admin_noah_credits(p_store_id uuid default null)
returns table (store_id uuid, credits_used int, credits_total int, credits_extra int, renewal_date date)
language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_superadmin() then raise exception 'FORBIDDEN'; end if;
  return query
    select s.id,
           (case when u.renewal_date is not null and u.renewal_date <= v_today then 0
                 else coalesce(u.credits_used, 0) end)::int,
           coalesce(public.noah_plan_credits(s.id), 0)::int,
           coalesce(u.credits_extra, 0)::int,
           u.renewal_date::date
    from public.stores s
    left join public.store_ai_usage u on u.store_id = s.id
    where p_store_id is null or s.id = p_store_id;
end $$;
grant execute on function public.admin_noah_credits(uuid) to authenticated;
