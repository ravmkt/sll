create or replace function public.builder_store_by_slug(p_slug text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.stores where slug = lower(p_slug) limit 1
$$;

create or replace function public.builder_store_by_domain(p_host text)
returns uuid language sql stable security definer set search_path = public as $$
  select store_id from public.store_domains
  where domain = lower(p_host) and status = 'verified' limit 1
$$;

revoke all on function public.builder_store_by_slug(text) from public;
revoke all on function public.builder_store_by_domain(text) from public;
grant execute on function public.builder_store_by_slug(text) to anon, authenticated;
grant execute on function public.builder_store_by_domain(text) to anon, authenticated;