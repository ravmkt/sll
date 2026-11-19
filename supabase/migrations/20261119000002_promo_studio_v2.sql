alter table public.promo_campaigns add column if not exists channels jsonb not null default '[]'::jsonb;
alter table public.promo_campaigns add column if not exists template_key text not null default 'classico';
alter table public.promo_campaigns add column if not exists art_mode text not null default 'template';
alter table public.promo_campaigns add column if not exists source_campaign_id uuid references public.promo_campaigns(id) on delete set null;
notify pgrst, 'reload schema';