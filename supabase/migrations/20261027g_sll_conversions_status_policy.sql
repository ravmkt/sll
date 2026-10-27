alter table public.sll_conversions
  add column if not exists status text not null default 'paid';

create index if not exists idx_sll_conversions_store_created
  on public.sll_conversions (store_id, created_at desc);

drop policy if exists sll_conv_owner_select on public.sll_conversions;
create policy sll_conv_owner_select on public.sll_conversions
  for select to authenticated
  using (store_id in (select id from public.stores where owner_user_id = auth.uid()));

grant select on public.sll_conversions to authenticated;
notify pgrst, 'reload schema';

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'sll_conversions' order by ordinal_position;