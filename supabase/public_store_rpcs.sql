begin;

create or replace function public.get_store_settings_public(p_store_id uuid)
returns setof public.store_settings_public
language sql stable security definer
set search_path = public
as $$
  select * from public.store_settings_public where store_id = p_store_id limit 1;
$$;

create or replace function public.get_store_public(p_store_id uuid)
returns setof public.stores_public
language sql stable security definer
set search_path = public
as $$
  select * from public.stores_public where id = p_store_id limit 1;
$$;

revoke all on function public.get_store_settings_public(uuid) from public;
revoke all on function public.get_store_public(uuid) from public;
grant execute on function public.get_store_settings_public(uuid) to anon, authenticated;
grant execute on function public.get_store_public(uuid) to anon, authenticated;

commit;
