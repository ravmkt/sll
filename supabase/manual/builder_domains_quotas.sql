-- Limpeza da versão antiga
drop table if exists public.store_quotas;
drop function if exists public.store_storage_used(uuid);

-- Slug único e colunas do Builder
create unique index if not exists stores_slug_unique on public.stores (slug) where slug is not null;

alter table public.stores
  add column if not exists builder_storage_bytes bigint not null default 0,
  add column if not exists max_custom_domains integer not null default 1;

-- Domínios próprios
create table if not exists public.store_domains (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  domain text not null unique,
  status text not null default 'pending' check (status in ('pending','verified','error')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
alter table public.store_domains drop constraint if exists store_domains_domain_lower;
alter table public.store_domains add constraint store_domains_domain_lower check (domain = lower(domain));
create index if not exists store_domains_store_idx on public.store_domains (store_id);

alter table public.store_domains enable row level security;

drop policy if exists store_domains_owner on public.store_domains;
create policy store_domains_owner on public.store_domains
  for all to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()))
  with check (store_id in (select id from public.stores where owner_user_id = auth.uid()));

drop policy if exists store_domains_superadmin on public.store_domains;
create policy store_domains_superadmin on public.store_domains
  for all to authenticated
  using (coalesce((auth.jwt() ->> 'is_superadmin')::boolean, (auth.jwt() -> 'app_metadata' ->> 'is_superadmin')::boolean, false))
  with check (coalesce((auth.jwt() ->> 'is_superadmin')::boolean, (auth.jwt() -> 'app_metadata' ->> 'is_superadmin')::boolean, false));

-- Limite de domínios por loja
create or replace function public.enforce_max_custom_domains()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.store_domains where store_id = new.store_id)
     >= (select coalesce(max_custom_domains, 1) from public.stores where id = new.store_id) then
    raise exception 'Limite de dominios proprios atingido para esta loja';
  end if;
  return new;
end $$;

drop trigger if exists trg_max_custom_domains on public.store_domains;
create trigger trg_max_custom_domains before insert on public.store_domains
  for each row execute function public.enforce_max_custom_domains();

-- Pode subir X bytes?
create or replace function public.store_can_upload(p_store uuid, p_bytes bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(s.storage_used_bytes,0) + coalesce(s.builder_storage_bytes,0) + p_bytes
         <= coalesce(s.storage_limit_bytes, 104857600)
  from public.stores s
  where s.id = p_store and s.owner_user_id = auth.uid()
$$;

-- Recalcula o uso do Builder a partir do Storage
create or replace function public.refresh_builder_storage(p_store uuid)
returns bigint language plpgsql security definer set search_path = public, storage as $$
declare v bigint;
begin
  if not exists (select 1 from public.stores where id = p_store and owner_user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  select coalesce(sum((metadata->>'size')::bigint), 0) into v
  from storage.objects
  where bucket_id = 'builder-assets' and (storage.foldername(name))[1] = p_store::text;
  update public.stores set builder_storage_bytes = v where id = p_store;
  return v;
end $$;
