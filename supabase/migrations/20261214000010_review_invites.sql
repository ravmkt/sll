begin;

create table if not exists public.review_invite_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  enabled boolean not null default false,
  days_after int not null default 15 check (days_after between 1 and 90),
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  email_subject text not null default 'Como foi sua compra na {{loja}}?' check (length(email_subject) <= 200),
  email_body text not null default 'Olá, {{nome}}! Sua compra chegou bem? Conte para a gente o que achou de {{produto}}. Leva menos de 1 minuto e você pode enviar fotos e vídeo.' check (length(email_body) <= 2000),
  whatsapp_body text not null default 'Olá, {{nome}}! Aqui é da {{loja}}. Como foi sua compra? Avalie {{produto}} (pode enviar foto e vídeo): {{link}}' check (length(whatsapp_body) <= 1000),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id text not null,
  token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  customer_name text,
  customer_email text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,
  source text not null default 'yampi',
  paid_at timestamptz not null default now(),
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','sending','sent','reviewed','skipped','failed')),
  email_sent_at timestamptz,
  whatsapp_sent_at timestamptz,
  reviewed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (store_id, order_id)
);

create index if not exists review_requests_due_idx on public.review_requests (due_at) where status = 'scheduled';
create index if not exists review_requests_store_idx on public.review_requests (store_id, created_at desc);

alter table public.review_invite_settings enable row level security;
alter table public.review_requests enable row level security;

grant select, insert, update on public.review_invite_settings to authenticated;
grant select on public.review_requests to authenticated;
grant all on public.review_invite_settings to service_role;
grant all on public.review_requests to service_role;

drop policy if exists review_invite_settings_owner on public.review_invite_settings;
create policy review_invite_settings_owner on public.review_invite_settings for all to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()))
  with check (store_id in (select id from public.stores where owner_user_id = auth.uid()));

drop policy if exists review_requests_owner_select on public.review_requests;
create policy review_requests_owner_select on public.review_requests for select to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()));

notify pgrst, 'reload schema';
commit;