create or replace function public.admin_create_hub_module(p_slug text, p_name text, p_status text, p_public boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_public boolean;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if v_name = '' then raise exception 'O nome do módulo é obrigatório.'; end if;
  if v_slug !~ '^[a-z][a-z0-9_]{1,39}$' then
    raise exception 'Chave inválida. Use letras minúsculas, números e _ (começando por letra).';
  end if;
  if p_status not in ('active', 'coming_soon', 'hidden') then raise exception 'Status inválido.'; end if;
  if exists (select 1 from public.hub_modules where slug = v_slug) then
    raise exception 'Já existe um módulo com a chave "%".', v_slug;
  end if;

  v_public := case when p_status = 'active' then coalesce(p_public, false) else false end;

  insert into public.hub_modules (slug, name, status, is_public_for_sale, sort_order, updated_at)
  values (v_slug, v_name, p_status, v_public,
          (select coalesce(max(sort_order), 0) + 1 from public.hub_modules), now());

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'module_created', jsonb_build_object('module_key', v_slug, 'name', v_name, 'status', p_status));

  return v_slug;
end;
$$;

create or replace function public.admin_module_plan_stats(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'plan_id', r.plan_id, 'total', r.total, 'paying', r.paying,
      'trial', r.trial, 'lifetime', r.lifetime, 'past_due', r.past_due))
    from (
      select s.dynamic_plan_id as plan_id,
             count(distinct s.store_id)::int as total,
             (count(distinct s.store_id) filter (where s.status = 'active'))::int as paying,
             (count(distinct s.store_id) filter (where s.status = 'trialing'))::int as trial,
             (count(distinct s.store_id) filter (where s.status = 'lifetime'))::int as lifetime,
             (count(distinct s.store_id) filter (where s.status = 'past_due'))::int as past_due
      from public.subscriptions s
      join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
      where s.is_current = true
        and s.status in ('active', 'trialing', 'lifetime', 'past_due')
        and dp.module_slug = p_slug
      group by s.dynamic_plan_id
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_create_hub_module(text, text, text, boolean) from public, anon;
revoke all on function public.admin_module_plan_stats(text) from public, anon;
grant execute on function public.admin_create_hub_module(text, text, text, boolean) to authenticated;
grant execute on function public.admin_module_plan_stats(text) to authenticated;