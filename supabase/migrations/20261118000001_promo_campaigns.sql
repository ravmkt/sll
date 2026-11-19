create table if not exists public.promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  ends_at date,
  format text not null default 'feed',
  message_template text not null,
  style jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_promo_campaigns_store on public.promo_campaigns (store_id, created_at desc);

create table if not exists public.promo_campaign_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.promo_campaigns(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  original_price numeric(12,2) not null,
  discount_pct numeric(6,2) not null default 0,
  promo_price numeric(12,2) not null,
  created_at timestamptz default now(),
  unique (campaign_id, product_id)
);
create index if not exists idx_promo_items_campaign on public.promo_campaign_items (campaign_id);
create index if not exists idx_promo_items_product on public.promo_campaign_items (store_id, product_id);

alter table public.promo_campaigns enable row level security;
alter table public.promo_campaign_items enable row level security;

drop policy if exists "Membro gerencia campanhas" on public.promo_campaigns;
create policy "Membro gerencia campanhas" on public.promo_campaigns
  for all using (public.is_store_owner_or_member(store_id))
  with check (public.is_store_owner_or_member(store_id));

drop policy if exists "Membro gerencia itens de campanha" on public.promo_campaign_items;
create policy "Membro gerencia itens de campanha" on public.promo_campaign_items
  for all using (public.is_store_owner_or_member(store_id))
  with check (public.is_store_owner_or_member(store_id));
