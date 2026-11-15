-- Try-On: liga/desliga o botão por loja

create or replace function public.tryon_admin_set_enabled(p_store_id uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = public, tryon as $$
begin
  if not (tryon.has_store_access(p_store_id) or tryon.is_superadmin()) then
    raise exception 'forbidden';
  end if;
  insert into tryon.settings(store_id, enabled) values (p_store_id, coalesce(p_enabled,false))
  on conflict (store_id) do update set enabled = excluded.enabled, updated_at = now();
end $$;
revoke all on function public.tryon_admin_set_enabled(uuid, boolean) from public, anon;
grant execute on function public.tryon_admin_set_enabled(uuid, boolean) to authenticated;

create or replace function public.tryon_public_config(p_store_id uuid)
returns jsonb language sql stable security definer set search_path = public, tryon as $$
  select coalesce(
    (select jsonb_build_object('enabled', s.enabled, 'button_text', s.button_text)
       from tryon.settings s where s.store_id = p_store_id),
    jsonb_build_object('enabled', false));
$$;
revoke all on function public.tryon_public_config(uuid) from public;
grant execute on function public.tryon_public_config(uuid) to anon, authenticated;