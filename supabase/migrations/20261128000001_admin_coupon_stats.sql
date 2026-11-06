create or replace function public.admin_coupon_stats()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(r order by (r->>'subs')::int desc, r->>'code')
    from (
      select jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'times_used', c.times_used,
        'subs', (select count(*) from public.subscriptions s where s.coupon_id = c.id),
        'stores', (select count(distinct s.store_id) from public.subscriptions s where s.coupon_id = c.id),
        'by_status', coalesce((
          select jsonb_object_agg(z.st, z.n)
          from (
            select coalesce(to_jsonb(s2)->>'status', '?') as st, count(*) as n
            from public.subscriptions s2 where s2.coupon_id = c.id group by 1
          ) z), '{}'::jsonb)
      ) as r
      from public.discount_coupons c
    ) q
  ), '[]'::jsonb);
end $function$;

grant execute on function public.admin_coupon_stats() to authenticated;