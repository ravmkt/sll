alter table public.marketing_items drop constraint if exists marketing_items_notice_style_chk;
alter table public.marketing_items
  add constraint marketing_items_notice_style_chk
  check (notice_style in ('info','warning','urgent','success'));