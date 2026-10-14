create table if not exists public.admin_store_communications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  recipient text not null,
  subject text,
  message text not null,
  status text not null default 'sent' check (status in ('sent','failed','opened')),
  error text,
  sent_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists admin_store_comm_store_idx on public.admin_store_communications (store_id, created_at desc);
alter table public.admin_store_communications enable row level security;

create or replace function public.admin_master_log_communication(
  p_store_id uuid, p_channel text, p_recipient text, p_subject text,
  p_message text, p_status text, p_error text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  insert into public.admin_store_communications (store_id, channel, recipient, subject, message, status, error)
  values (p_store_id, p_channel, p_recipient, nullif(p_subject,''), p_message, p_status, nullif(p_error,''))
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.admin_master_log_communication(uuid, text, text, text, text, text, text) to authenticated;

create or replace function public.admin_master_store_communications(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return (
    select jsonb_build_object(
      'email_count', count(*) filter (where c.channel = 'email' and c.status = 'sent'),
      'whatsapp_count', count(*) filter (where c.channel = 'whatsapp'),
      'list', coalesce((
        select jsonb_agg(to_jsonb(t) order by t.created_at desc)
        from (select id, channel, recipient, subject, message, status, error, created_at
              from public.admin_store_communications
              where store_id = p_store_id order by created_at desc limit 200) t
      ), '[]'::jsonb))
    from public.admin_store_communications c where c.store_id = p_store_id);
end $$;
grant execute on function public.admin_master_store_communications(uuid) to authenticated;