create table if not exists public.admin_store_benefits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  kind text not null check (kind in ('trial_days', 'discount_percent', 'coupon')),
  value text not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.admin_store_benefits enable row level security;

create or replace function public.admin_master_stores_overview()
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
        case
          when exists (select 1 from public.subscriptions s where s.store_id::text = st.id::text and s.is_current = true and s.status = 'past_due') then 'past_due'
          when exists (select 1 from public.subscriptions s where s.store_id::text = st.id::text and s.is_current = true and s.status in ('active', 'lifetime')) then 'active'
          when exists (select 1 from public.subscriptions s where s.store_id::text = st.id::text and s.is_current = true and s.status = 'trialing') then 'trial'
          else 'inactive'
        end as status,
        coalesce((
          select jsonb_agg(distinct coalesce(dp.plan_name, p.name)) filter (where coalesce(dp.plan_name, p.name) is not null)
          from public.subscriptions s
          left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
          left join public.plans p on p.id = s.plan_id
          where s.store_id::text = st.id::text and s.is_current = true
            and s.status in ('active', 'trialing', 'past_due', 'lifetime')
        ), '[]'::jsonb) as plans,
        coalesce((
          select jsonb_agg(distinct s.module_key) filter (where s.module_key is not null)
          from public.subscriptions s
          where s.store_id::text = st.id::text and s.is_current = true
            and s.status in ('active', 'trialing', 'past_due', 'lifetime')
        ), '[]'::jsonb) as modules,
        (select count(*)::int from public.stores x where x.referred_by_store_id::text = st.id::text) as referrals_made,
        exists (select 1 from public.subscriptions s where s.store_id::text = st.id::text and s.is_current = true and s.status = 'lifetime') as is_lifetime,
        coalesce((
          select jsonb_agg(jsonb_build_object('id', s.id, 'status', s.status))
          from public.subscriptions s
          where s.store_id::text = st.id::text and s.is_current = true
        ), '[]'::jsonb) as subs
      from public.stores st
      left join auth.users u on u.id::text = st.owner_user_id::text
    ) r
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_master_store_full(p_store_id uuid)
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
        select st.id, st.name, st.url, st.platform, st.contact_name, st.contact_email,
               st.owner_contact_email, st.whatsapp, u.email as owner_email, u.last_sign_in_at,
               st.created_at, st.storage_used_bytes, st.storage_limit_bytes,
               st.trial_ends_at, st.past_due_since,
               (select r.name from public.stores r where r.id::text = st.referred_by_store_id::text) as referred_by_name
        from public.stores st
        left join auth.users u on u.id::text = st.owner_user_id::text
        where st.id = p_store_id
      ) x
    ),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'status', s.status, 'module_key', s.module_key,
        'plan_name', coalesce(dp.plan_name, p.name), 'billing_cycle', s.billing_cycle,
        'is_current', s.is_current, 'created_at', s.created_at,
        'has_asaas', s.asaas_subscription_id is not null) order by s.created_at desc)
      from public.subscriptions s
      left join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
      left join public.plans p on p.id = s.plan_id
      where s.store_id::text = p_store_id::text
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'amount_cents', i.amount_cents, 'status', i.status,
        'due_date', i.due_date, 'paid_at', i.paid_at, 'description', i.description,
        'created_at', i.created_at) order by i.created_at desc)
      from (select * from public.invoices where store_id::text = p_store_id::text order by created_at desc limit 50) i
    ), '[]'::jsonb),
    'paid_cents', (select coalesce(sum(amount_cents), 0) from public.invoices where store_id::text = p_store_id::text and paid_at is not null),
    'open_cents', (select coalesce(sum(amount_cents), 0) from public.invoices where store_id::text = p_store_id::text and paid_at is null and status in ('pending', 'overdue', 'open')),
    'paid_count', (select count(*)::int from public.invoices where store_id::text = p_store_id::text and paid_at is not null),
    'events_30d', coalesce((
      select jsonb_object_agg(e.event_type, e.n)
      from (select event_type, count(*)::int as n from public.store_activity_events
            where store_id::text = p_store_id::text and created_at > now() - interval '30 days'
            group by event_type) e
    ), '{}'::jsonb),
    'events_total', coalesce((
      select jsonb_object_agg(e.event_type, e.n)
      from (select event_type, count(*)::int as n from public.store_activity_events
            where store_id::text = p_store_id::text group by event_type) e
    ), '{}'::jsonb),
    'videos_count', (select count(*)::int from vidlytics.vid_videos where store_id::text = p_store_id::text),
    'last_event_at', (select max(created_at) from public.store_activity_events where store_id::text = p_store_id::text),
    'referrals', jsonb_build_object(
      'made_count', (select count(*)::int from public.stores where referred_by_store_id::text = p_store_id::text),
      'commission_total', (select coalesce(sum(amount), 0) from public.referral_rewards where referrer_store_id::text = p_store_id::text and status <> 'canceled'),
      'list', coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'created_at', r.created_at) order by r.created_at desc)
        from (select id, name, created_at from public.stores where referred_by_store_id::text = p_store_id::text order by created_at desc limit 100) r
      ), '[]'::jsonb)
    ),
    'benefits', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'kind', b.kind, 'value', b.value, 'note', b.note, 'created_at', b.created_at) order by b.created_at desc)
      from public.admin_store_benefits b where b.store_id = p_store_id
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object('action', a.action, 'details', a.details, 'created_at', a.created_at) order by a.created_at desc)
      from (select * from public.admin_audit_logs where details ->> 'store_id' = p_store_id::text order by created_at desc limit 100) a
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(jsonb_build_object('event_type', ev.event_type, 'created_at', ev.created_at, 'page_path', ev.page_path) order by ev.created_at desc)
      from (select event_type, created_at, metadata ->> 'page_path' as page_path
            from public.store_activity_events where store_id::text = p_store_id::text
            order by created_at desc limit 50) ev
    ), '[]'::jsonb)
  ) into res;

  return res;
end;
$$;

create or replace function public.admin_master_store_update(p_store_id uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(coalesce(p_data ->> 'name', '')), '');
  v_url text := nullif(trim(coalesce(p_data ->> 'url', '')), '');
  v_platform text := nullif(trim(coalesce(p_data ->> 'platform', '')), '');
  v_contact text := nullif(trim(coalesce(p_data ->> 'contact_name', '')), '');
  v_email text := nullif(trim(coalesce(p_data ->> 'contact_email', '')), '');
  v_owner text := nullif(trim(coalesce(p_data ->> 'owner_contact_email', '')), '');
  v_wpp text := nullif(regexp_replace(coalesce(p_data ->> 'whatsapp', ''), '\D', '', 'g'), '');
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if v_name is null then
    raise exception 'name required';
  end if;

  update public.stores
     set name = v_name, url = v_url, platform = coalesce(v_platform, platform),
         contact_name = v_contact, contact_email = v_email, owner_contact_email = v_owner,
         whatsapp = v_wpp, updated_at = now()
   where id = p_store_id;

  update public.store_settings
     set store_name = v_name, store_url = v_url, platform = coalesce(v_platform, platform),
         contact_email = v_email, owner_contact_email = v_owner, updated_at = now()
   where store_id::text = p_store_id::text;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'store_updated', jsonb_build_object('store_id', p_store_id, 'changes', p_data));
end;
$$;

create or replace function public.admin_master_store_delete(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  select name into v_name from public.stores where id = p_store_id;
  if not found then
    raise exception 'store not found';
  end if;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'store_deleted', jsonb_build_object('store_id', p_store_id, 'name', v_name));

  delete from public.admin_store_benefits where store_id = p_store_id;
  delete from public.stores where id = p_store_id;
end;
$$;

create or replace function public.admin_master_list_plans()
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
    select jsonb_agg(jsonb_build_object('id', dp.id, 'name', dp.plan_name, 'module_key', to_jsonb(dp) ->> 'module_key') order by dp.plan_name)
    from public.dynamic_plans dp
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_master_change_plan(p_subscription_id uuid, p_plan_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  v_store uuid;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  update public.subscriptions s
     set dynamic_plan_id = dp.id
    from public.dynamic_plans dp
   where dp.id::text = p_plan_id and s.id = p_subscription_id
  returning s.store_id into v_store;
  get diagnostics n = row_count;

  if n = 0 then
    raise exception 'subscription or plan not found';
  end if;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'subscription_plan_changed',
          jsonb_build_object('store_id', v_store, 'subscription_id', p_subscription_id, 'plan_id', p_plan_id));
  return n;
end;
$$;

create or replace function public.admin_master_add_benefit(p_store_id uuid, p_kind text, p_value text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if p_kind not in ('trial_days', 'discount_percent', 'coupon') then
    raise exception 'invalid kind';
  end if;

  if p_kind = 'trial_days' then
    v_days := p_value::int;
    if v_days < 1 or v_days > 365 then
      raise exception 'dias entre 1 e 365';
    end if;
    update public.stores
       set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => v_days)
     where id = p_store_id;
  elsif p_kind = 'discount_percent' then
    if p_value::numeric <= 0 or p_value::numeric > 100 then
      raise exception 'desconto entre 1 e 100';
    end if;
  end if;

  insert into public.admin_store_benefits (store_id, kind, value, note, created_by)
  values (p_store_id, p_kind, trim(p_value), nullif(trim(coalesce(p_note, '')), ''), auth.uid());

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'benefit_applied',
          jsonb_build_object('store_id', p_store_id, 'kind', p_kind, 'value', p_value, 'note', p_note));
end;
$$;

revoke all on function public.admin_master_stores_overview() from public, anon;
revoke all on function public.admin_master_store_full(uuid) from public, anon;
revoke all on function public.admin_master_store_update(uuid, jsonb) from public, anon;
revoke all on function public.admin_master_store_delete(uuid) from public, anon;
revoke all on function public.admin_master_list_plans() from public, anon;
revoke all on function public.admin_master_change_plan(uuid, text) from public, anon;
revoke all on function public.admin_master_add_benefit(uuid, text, text, text) from public, anon;
grant execute on function public.admin_master_stores_overview() to authenticated;
grant execute on function public.admin_master_store_full(uuid) to authenticated;
grant execute on function public.admin_master_store_update(uuid, jsonb) to authenticated;
grant execute on function public.admin_master_store_delete(uuid) to authenticated;
grant execute on function public.admin_master_list_plans() to authenticated;
grant execute on function public.admin_master_change_plan(uuid, text) to authenticated;
grant execute on function public.admin_master_add_benefit(uuid, text, text, text) to authenticated;

-- Conferencia: colunas usadas que NAO existem (esperado: nenhuma linha)
select t.tbl as tabela, t.col as coluna_faltando
from (values
  ('stores','contact_name'),('stores','owner_contact_email'),('stores','updated_at'),
  ('stores','referred_by_store_id'),('stores','whatsapp'),('stores','storage_used_bytes'),
  ('stores','trial_ends_at'),('stores','past_due_since'),('stores','owner_user_id'),
  ('store_settings','store_name'),('store_settings','store_url'),('store_settings','platform'),
  ('store_settings','contact_email'),('store_settings','owner_contact_email'),('store_settings','updated_at'),
  ('subscriptions','asaas_subscription_id'),('subscriptions','dynamic_plan_id'),('subscriptions','billing_cycle'),
  ('dynamic_plans','plan_name'),
  ('invoices','amount_cents'),('invoices','due_date'),('invoices','paid_at'),
  ('store_activity_events','metadata'),
  ('referral_rewards','referrer_store_id'),('referral_rewards','amount'),('referral_rewards','status'),
  ('admin_audit_logs','admin_id'),('admin_audit_logs','details')
) t(tbl, col)
where not exists (
  select 1 from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = t.tbl and c.column_name = t.col);