create or replace function public._delete_hub_module(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.hub_modules where slug = p_slug) then
    raise exception 'Módulo não encontrado.';
  end if;
  if exists (select 1 from public.subscriptions s where s.module_key = p_slug and s.is_current) then
    raise exception 'Este módulo tem assinaturas ativas. Oculte-o em vez de excluir.';
  end if;
  if exists (select 1 from public.subscriptions s join public.dynamic_plans d on d.id = s.dynamic_plan_id where d.module_slug = p_slug) then
    raise exception 'Há assinaturas (inclusive antigas) em planos deste módulo. Oculte-o em vez de excluir.';
  end if;
  if exists (select 1 from public.combo_modules where module_slug = p_slug) then
    raise exception 'Este módulo faz parte de combos. Remova-o dos combos primeiro.';
  end if;

  delete from public.plan_addons where module_slug = p_slug;
  delete from public.dynamic_plans where module_slug = p_slug and not is_combo;
  delete from public.hub_modules where slug = p_slug;
exception when foreign_key_violation then
  raise exception 'O módulo ainda é referenciado por outros dados. Oculte-o em vez de excluir.';
end;
$$;

create or replace function public.admin_delete_hub_module(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  perform public._delete_hub_module(p_slug);
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'module_deleted', jsonb_build_object('module_key', p_slug));
end;
$$;

revoke all on function public._delete_hub_module(text) from public, anon, authenticated;
revoke all on function public.admin_delete_hub_module(text) from public, anon;
grant execute on function public.admin_delete_hub_module(text) to authenticated;

-- Para achar o módulo de teste (rode separado):
-- select slug, name, status from public.hub_modules order by sort_order;
-- Para excluir pelo SQL Editor (troque o slug):
-- select public._delete_hub_module('SLUG_DO_TESTE');