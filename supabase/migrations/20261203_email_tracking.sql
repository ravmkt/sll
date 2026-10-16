alter table public.marketing_email_sends
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists open_count int not null default 0,
  add column if not exists click_count int not null default 0;
create index if not exists marketing_email_sends_resend_idx on public.marketing_email_sends(resend_id);

create or replace function public.email_track_event(p_resend_id text, p_type text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_resend_id is null then return; end if;
  if p_type = 'email.delivered' then
    update public.marketing_email_sends set delivered_at = coalesce(delivered_at, now()) where resend_id = p_resend_id;
  elsif p_type = 'email.opened' then
    update public.marketing_email_sends set opened_at = coalesce(opened_at, now()), delivered_at = coalesce(delivered_at, now()), open_count = open_count + 1 where resend_id = p_resend_id;
  elsif p_type = 'email.clicked' then
    update public.marketing_email_sends set clicked_at = coalesce(clicked_at, now()), opened_at = coalesce(opened_at, now()), delivered_at = coalesce(delivered_at, now()), click_count = click_count + 1 where resend_id = p_resend_id;
  elsif p_type = 'email.bounced' then
    update public.marketing_email_sends set bounced_at = coalesce(bounced_at, now()) where resend_id = p_resend_id;
  elsif p_type = 'email.complained' then
    update public.marketing_email_sends set complained_at = coalesce(complained_at, now()) where resend_id = p_resend_id;
  end if;
end $$;
revoke all on function public.email_track_event(text, text) from public, anon, authenticated;
grant execute on function public.email_track_event(text, text) to service_role;

create or replace function public.admin_email_campaigns_list()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select c.*,
        (select count(*) from public.marketing_email_sends s where s.campaign_id = c.id and s.delivered_at is not null) as delivered,
        (select count(*) from public.marketing_email_sends s where s.campaign_id = c.id and s.opened_at is not null) as opened,
        (select count(*) from public.marketing_email_sends s where s.campaign_id = c.id and s.clicked_at is not null) as clicked,
        (select count(*) from public.marketing_email_sends s where s.campaign_id = c.id and s.bounced_at is not null) as bounced,
        (select count(*) from public.marketing_email_sends s where s.campaign_id = c.id and s.complained_at is not null) as complained
      from public.marketing_email_campaigns c
      order by c.created_at desc limit 100
    ) x
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_email_campaign_detail(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return (
    select jsonb_build_object(
      'campaign', to_jsonb(c),
      'sends', coalesce((
        select jsonb_agg(jsonb_build_object(
          'email', s.email, 'status', s.status, 'error', s.error,
          'delivered_at', s.delivered_at, 'opened_at', s.opened_at, 'clicked_at', s.clicked_at,
          'bounced_at', s.bounced_at, 'complained_at', s.complained_at,
          'open_count', s.open_count, 'click_count', s.click_count) order by s.email)
        from public.marketing_email_sends s where s.campaign_id = c.id
      ), '[]'::jsonb))
    from public.marketing_email_campaigns c where c.id = p_id
  );
end $$;

create or replace function public.admin_email_metrics(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'sent', count(*) filter (where status = 'sent'),
    'failed', count(*) filter (where status = 'failed'),
    'delivered', count(*) filter (where delivered_at is not null),
    'opened', count(*) filter (where opened_at is not null),
    'clicked', count(*) filter (where clicked_at is not null),
    'bounced', count(*) filter (where bounced_at is not null),
    'complained', count(*) filter (where complained_at is not null)
  ) into v
  from public.marketing_email_sends
  where created_at >= p_start::timestamptz and created_at < (p_end + 1)::timestamptz;
  return v;
end $$;