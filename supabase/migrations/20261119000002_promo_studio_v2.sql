alter table public.promo_campaigns add column if not exists channels jsonb not null default '[]'::jsonb;
alter table public.promo_campaigns add column if not exists template_key text not null default 'classico';
alter table public.promo_campaigns add column if not exists art_mode text not null default 'template';
alter table public.promo_campaigns add column if not exists source_campaign_id uuid references public.promo_campaigns(id) on delete set null;
notify pgrst, 'reload schema';

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'promo_campaigns'
  and column_name in ('channels', 'template_key', 'art_mode', 'source_campaign_id');