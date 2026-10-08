create or replace function public.admin_list_stores()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc)
    from (
      select
        st.id, st.name, st.url, st.platform, st.contact_email, st.whatsapp,
        u.email as owner_email, u.last_sign_in_at, st.created_at,
        st.storage_used_bytes, st.storage_limit_bytes,
        case
          when exists (select 1 from public.subscriptions s where s.store_id::text = st.id::text and s.is_current = true and s.status in ('active','lifetime')) then 'active'
          when exists (select 1 from public.subscriptions s where s.store_id::text = st.id::text and s.is_current = true and s.status = 'trialing') then 'trial'
          when exists (select 1 from public.subscriptions s where s.store_id::text = st.id::text and s.is_current = true and s.status = 'past_due') then 'past_due'
          else 'inactive'
        end as status,
        (
          select coalesce(jsonb_agg(distinct coalesce(dp.plan_name, p.name)) filter (where coalesce(dp.plan_name, p.name) is not null), '[]'::jsonb)
          from public.subscriptions s
          left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
          left join public.plans p on p.id = s.plan_id
          where s.store_id::text = st.id::text and s.is_current = true
            and s.status in ('active','trialing','past_due','lifetime')
        ) as plans
      from public.stores st
      left join auth.users u on u.id::text = st.owner_user_id::text
    ) r
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_store_detail(p_store_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  res jsonb;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'store', (
      select to_jsonb(x) from (
        select st.id, st.name, st.url, st.platform, st.contact_email, st.whatsapp,
               u.email as owner_email, u.last_sign_in_at, st.created_at,
               st.storage_used_bytes, st.storage_limit_bytes, st.trial_ends_at, st.past_due_since
        from public.stores st
        left join auth.users u on u.id::text = st.owner_user_id::text
        where st.id = p_store_id
      ) x
    ),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'status', s.status, 'module_key', s.module_key,
        'plan_name', coalesce(dp.plan_name, p.name), 'billing_cycle', s.billing_cycle,
        'is_current', s.is_current, 'created_at', s.created_at) order by s.created_at desc)
      from public.subscriptions s
      left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
      left join public.plans p on p.id = s.plan_id
      where s.store_id::text = p_store_id::text
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'amount_cents', i.amount_cents, 'status', i.status,
        'due_date', i.due_date, 'paid_at', i.paid_at, 'description', i.description) order by i.created_at desc)
      from (select * from public.invoices where store_id::text = p_store_id::text order by created_at desc limit 10) i
    ), '[]'::jsonb),
    'paid_cents', (select coalesce(sum(amount_cents), 0) from public.invoices where store_id::text = p_store_id::text and paid_at is not null),
    'open_cents', (select coalesce(sum(amount_cents), 0) from public.invoices where store_id::text = p_store_id::text and paid_at is null and status in ('pending','overdue','open')),
    'events_30d', coalesce((
      select jsonb_object_agg(e.event_type, e.n)
      from (select event_type, count(*)::int as n from public.store_activity_events
            where store_id::text = p_store_id::text and created_at > now() - interval '30 days'
            group by event_type) e
    ), '{}'::jsonb),
    'referrals', jsonb_build_object(
      'count', (select count(*)::int from public.referral_rewards where referrer_store_id::text = p_store_id::text),
      'total', (select coalesce(sum(amount), 0) from public.referral_rewards where referrer_store_id::text = p_store_id::text)
    ),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object('action', a.action, 'details', a.details, 'created_at', a.created_at) order by a.created_at desc)
      from (select * from public.admin_audit_logs where details ->> 'store_id' = p_store_id::text order by created_at desc limit 10) a
    ), '[]'::jsonb)
  ) into res;

  return res;
end;
$$;

create or replace function public.admin_set_store_subscription(p_store_id uuid, p_status text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('active', 'canceled') then
    raise exception 'invalid status';
  end if;

  update public.subscriptions
     set status = p_status
   where store_id::text = p_store_id::text and is_current = true;
  get diagnostics n = row_count;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'subscription_status_changed',
          jsonb_build_object('store_id', p_store_id, 'status', p_status, 'rows', n));

  return n;
end;
$$;

revoke all on function public.admin_list_stores() from public, anon;
revoke all on function public.admin_store_detail(uuid) from public, anon;
revoke all on function public.admin_set_store_subscription(uuid, text) from public, anon;
grant execute on function public.admin_list_stores() to authenticated;
grant execute on function public.admin_store_detail(uuid) to authenticated;
grant execute on function public.admin_set_store_subscription(uuid, text) to authenticated;