create table if not exists public.billing_profiles (
  store_id uuid primary key references public.stores(id) on delete cascade,
  doc_type text not null default 'cnpj' check (doc_type in ('cnpj','cpf')),
  document text not null default '',
  legal_name text not null default '',
  state_registration text not null default '',
  finance_email text not null default '',
  cep text not null default '',
  street text not null default '',
  street_number text not null default '',
  city text not null default '',
  uf text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  description text not null default '',
  cycle text not null default '',
  amount_cents integer not null default 0,
  payment_method text not null default '',
  status text not null default 'pending' check (status in ('paid','pending','failed')),
  receipt_url text,
  invoice_url text,
  external_id text
);
create index if not exists billing_invoices_store_idx on public.billing_invoices (store_id, created_at desc);
create unique index if not exists billing_invoices_ext_uidx on public.billing_invoices (store_id, external_id) where external_id is not null;

alter table public.billing_profiles enable row level security;
alter table public.billing_invoices enable row level security;

drop policy if exists billing_profiles_owner on public.billing_profiles;
create policy billing_profiles_owner on public.billing_profiles
  for all to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()))
  with check (store_id in (select id from public.stores where owner_user_id = auth.uid()));

drop policy if exists billing_invoices_owner_select on public.billing_invoices;
create policy billing_invoices_owner_select on public.billing_invoices
  for select to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()));

grant select, insert, update on public.billing_profiles to authenticated;
grant select on public.billing_invoices to authenticated;
grant all on public.billing_profiles, public.billing_invoices to service_role;
notify pgrst, 'reload schema';