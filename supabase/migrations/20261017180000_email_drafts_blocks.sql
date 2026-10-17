alter table public.marketing_email_campaigns add column if not exists blocks jsonb;

create table if not exists public.marketing_email_drafts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('draft','template')),
  name text not null,
  subject text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  audience text not null default 'all' check (audience in ('all','past_due','trial','store')),
  store_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_email_drafts enable row level security;
drop policy if exists "superadmin all drafts" on public.marketing_email_drafts;
create policy "superadmin all drafts" on public.marketing_email_drafts
  for all using (public.is_superadmin()) with check (public.is_superadmin());

create or replace function public.admin_email_drafts_list()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(d) order by d.updated_at desc)
    from public.marketing_email_drafts d
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_email_draft_save(
  p_id uuid, p_kind text, p_name text, p_subject text, p_blocks jsonb, p_audience text, p_store_id uuid
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v uuid;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_kind not in ('draft','template') then raise exception 'tipo invalido'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Informe um nome'; end if;
  if p_id is not null then
    update public.marketing_email_drafts
       set name = trim(p_name), subject = coalesce(p_subject, ''), blocks = coalesce(p_blocks, '[]'::jsonb),
           audience = p_audience, store_id = p_store_id, updated_at = now()
     where id = p_id and kind = p_kind
    returning id into v;
  end if;
  if v is null then
    insert into public.marketing_email_drafts (kind, name, subject, blocks, audience, store_id)
    values (p_kind, trim(p_name), coalesce(p_subject, ''), coalesce(p_blocks, '[]'::jsonb), p_audience, p_store_id)
    returning id into v;
  end if;
  return v;
end $$;

create or replace function public.admin_email_draft_delete(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  delete from public.marketing_email_drafts where id = p_id;
end $$;

create or replace function public.admin_email_campaigns_list()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg((to_jsonb(x) - 'html' - 'blocks') order by x.created_at desc)
    from (
      select c.*,
        (c.blocks is not null) as has_blocks,
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

revoke all on function public.admin_email_drafts_list() from public, anon;
revoke all on function public.admin_email_draft_save(uuid, text, text, text, jsonb, text, uuid) from public, anon;
revoke all on function public.admin_email_draft_delete(uuid) from public, anon;
grant execute on function public.admin_email_drafts_list() to authenticated;
grant execute on function public.admin_email_draft_save(uuid, text, text, text, jsonb, text, uuid) to authenticated;
grant execute on function public.admin_email_draft_delete(uuid) to authenticated;