alter table public.products
  add column if not exists description text,
  add column if not exists link text,
  add column if not exists image_url text,
  add column if not exists images text[] not null default '{}',
  add column if not exists price numeric(12,2);

notify pgrst, 'reload schema';

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'products'
  and column_name in ('description','link','image_url','images','price','category_id','brand_id')
order by column_name;