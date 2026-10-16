create or replace function public.admin_stores_picker()
returns table(id uuid, name text, contact_name text, owner_contact_email text)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return query
    select s.id, s.name::text, s.contact_name::text, s.owner_contact_email::text
    from public.stores s
    order by lower(coalesce(s.name, s.contact_name, ''));
end $$;
revoke all on function public.admin_stores_picker() from public, anon;
grant execute on function public.admin_stores_picker() to authenticated;