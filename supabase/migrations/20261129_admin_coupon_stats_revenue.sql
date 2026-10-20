create or replace function public.admin_coupon_stats()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(q.r order by (q.r->>'subs')::int desc, q.r->>'code')
    from (
      select jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'times_used', c.times_used,
        'subs', a.subs,
        'stores', a.stores,
        'active_subs', a.act,
        'discount_cents', a.disc,
        'revenue_cents', a.rev,
        'by_status', coalesce((
          select jsonb_object_agg(z.st, z.n)
          from (
            select coalesce(s2.status, '?') as st, count(*) as n
            from public.subscriptions s2 where s2.coupon_id = c.id group by 1
          ) z), '{}'::jsonb)
      ) as r
      from public.discount_coupons c
      cross join lateral (
        select count(*) as subs,
               count(distinct s.store_id) as stores,
               count(*) filter (where s.status = 'active') as act,
               coalesce(sum(s.coupon_discount_cents) filter (where s.status = 'active'), 0) as disc,
               coalesce(sum(s.recurring_value_cents) filter (where s.status = 'active'), 0) as rev
        from public.subscriptions s where s.coupon_id = c.id
      ) a
    ) q
  ), '[]'::jsonb);
end $function$;

grant execute on function public.admin_coupon_stats() to authenticated;