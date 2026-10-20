create or replace function public.admin_combo_stats(p_store uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('plan_id', x.plan_id, 'total', x.total, 'trial', x.trial, 'paying', x.paying))
    from (
      select dp.id as plan_id,
        count(distinct s.store_id) filter (where s.status in ('active','trialing','past_due','lifetime')) as total,
        count(distinct s.store_id) filter (where s.status = 'trialing') as trial,
        count(distinct s.store_id) filter (where s.status = 'active') as paying
      from public.dynamic_plans dp
      left join public.subscriptions s on s.dynamic_plan_id = dp.id and s.is_current and (p_store is null or s.store_id = p_store)
      where dp.is_combo
      group by dp.id
    ) x
  ), '[]'::jsonb);
end;
$fn$;

create or replace function public.admin_reorder_combos(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  update public.dynamic_plans d set sort_order = x.ord
  from unnest(p_ids) with ordinality as x(id, ord)
  where d.id = x.id and d.is_combo;
end;
$fn$;

create or replace function public.admin_delete_hub_module(p_slug text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if exists (select 1 from public.subscriptions where module_key = p_slug) then raise exception 'Modulo com assinaturas: use Pausar.'; end if;
  if exists (select 1 from public.dynamic_plans where module_slug = p_slug) then raise exception 'Remova os planos do modulo antes de excluir.'; end if;
  if exists (select 1 from public.combo_modules where module_slug = p_slug) then raise exception 'Modulo faz parte de um combo.'; end if;
  delete from public.hub_modules where slug = p_slug;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'hub_module_deleted', jsonb_build_object('slug', p_slug));
end;
$fn$;

revoke all on function public.admin_combo_stats(uuid) from public;
revoke all on function public.admin_reorder_combos(uuid[]) from public;
revoke all on function public.admin_delete_hub_module(text) from public;
grant execute on function public.admin_combo_stats(uuid) to authenticated;
grant execute on function public.admin_reorder_combos(uuid[]) to authenticated;
grant execute on function public.admin_delete_hub_module(text) to authenticated;