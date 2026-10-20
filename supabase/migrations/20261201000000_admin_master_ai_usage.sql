create or replace function public.admin_master_ai_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'store_id', st.id,
      'used', case when u.store_id is null or u.renewal_date <= v_today then 0 else u.credits_used end,
      'total', public.noah_plan_credits(st.id),
      'extra', coalesce(u.credits_extra, 0),
      'renewal_date', u.renewal_date))
    from public.stores st
    left join public.store_ai_usage u on u.store_id = st.id
  ), '[]'::jsonb);
end $function$;

revoke all on function public.admin_master_ai_usage() from public, anon;
grant execute on function public.admin_master_ai_usage() to authenticated;
