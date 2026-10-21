begin;

drop policy if exists "Lojistas podem solicitar saques" on public.affiliate_withdrawals;

create or replace view public.affiliate_dashboard_summary as
select
  s.id as store_id,
  s.referral_code,
  coalesce(sum(rr.amount) filter (where rr.status = 'paid'::text), 0::numeric) as total_generated,
  coalesce(sum(rr.amount) filter (where rr.status = 'paid'::text), 0::numeric)
    - coalesce((
        select sum(aw.amount)
        from public.affiliate_withdrawals aw
        where aw.store_id = s.id
          and aw.status = any (array['pending'::text, 'approved'::text, 'paid'::text])
      ), 0::numeric) as available_balance,
  count(distinct rr.referred_store_id) as total_referred_stores
from public.stores s
left join public.referral_rewards rr on rr.referrer_store_id = s.id
group by s.id, s.referral_code;

commit;
