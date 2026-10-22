alter table public.sll_conversions enable row level security;

drop policy if exists "store_members_read_conversions" on public.sll_conversions;
create policy "store_members_read_conversions" on public.sll_conversions
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = sll_conversions.store_id));

-- conferir: colunas da view que o widget da live consulta
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'store_settings_public' order by 1;