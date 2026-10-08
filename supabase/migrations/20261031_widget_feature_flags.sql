create or replace function public.widget_feature_flags(p_store_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(f.module_slug || ':' || f.key), '{}'::text[])
  from public.feature_flags f
  where f.mode = 'all'
     or (f.mode = 'stores' and exists (
          select 1 from public.feature_flag_stores fs
          where fs.flag_id = f.id and fs.store_id = p_store_id));
$$;

revoke all on function public.widget_feature_flags(uuid) from public;
grant execute on function public.widget_feature_flags(uuid) to anon, authenticated;