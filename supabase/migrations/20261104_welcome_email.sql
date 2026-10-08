alter table public.stores add column if not exists welcome_email_sent_at timestamptz;
update public.stores s set welcome_email_sent_at = now()
where welcome_email_sent_at is null
  and exists (select 1 from public.subscriptions x where x.store_id = s.id and x.status in ('active','lifetime'));
select count(*) as lojas_ja_marcadas from public.stores where welcome_email_sent_at is not null;