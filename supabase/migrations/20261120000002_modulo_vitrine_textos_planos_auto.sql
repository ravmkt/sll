alter table public.hub_modules add column if not exists description text;
alter table public.hub_modules add column if not exists features jsonb not null default '[]'::jsonb;

-- cria os planos base do módulo (inativos, preço zero) se ainda não existirem
create or replace function public._ensure_module_plans(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  i int := 0;
  v_name text;
begin
  if exists (select 1 from public.dynamic_plans where module_slug = p_slug and not is_combo) then
    return;
  end if;
  select name into v_name from public.hub_modules where slug = p_slug;
  begin
    foreach t in array array['starter', 'pro', 'scale'] loop
      i := i + 1;
      insert into public.dynamic_plans (
        module_slug, plan_tier, plan_name, is_combo,
        price_monthly_cents, price_semiannual_cents, price_annual_cents,
        limits_config, is_recommended, sort_order, is_active
      ) values (
        p_slug, t, coalesce(v_name, p_slug) || ' ' || initcap(t), false,
        0, 0, 0, '{}'::jsonb, (t = 'pro'), i, false
      );
    end loop;
  exception when others then
    raise notice 'Planos automáticos não criados para %: %', p_slug, sqlerrm;
  end;
end;
$$;
revoke all on function public._ensure_module_plans(text) from public, anon, authenticated;

-- atualização do módulo, agora com descrição e benefícios (null = mantém)
drop function if exists public.admin_update_hub_module(text, text, text, boolean, int, text);

create or replace function public.admin_update_hub_module(
  p_slug text, p_name text, p_status text, p_public boolean, p_sort int, p_logo text default null,
  p_description text default null, p_features jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_old public.hub_modules%rowtype;
  v_public boolean;
  v_down boolean;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'O nome do módulo é obrigatório.';
  end if;
  if p_status not in ('active', 'coming_soon', 'hidden') then
    raise exception 'Status inválido.';
  end if;
  if p_features is not null and jsonb_typeof(p_features) <> 'array' then
    raise exception 'Benefícios inválidos.';
  end if;

  select * into v_old from public.hub_modules where slug = p_slug;
  if not found then
    raise exception 'Módulo não encontrado.';
  end if;

  v_public := case when p_status = 'active' then coalesce(p_public, false) else false end;
  v_down := coalesce(p_sort, v_old.sort_order, 0) > coalesce(v_old.sort_order, 0);

  update public.hub_modules
     set name = trim(p_name),
         status = p_status,
         is_public_for_sale = v_public,
         sort_order = coalesce(p_sort, sort_order),
         logo_url = case when p_logo is null then logo_url when p_logo = '' then null else p_logo end,
         description = case when p_description is null then description else nullif(trim(p_description), '') end,
         features = coalesce(p_features, features),
         updated_at = now()
   where slug = p_slug;

  update public.hub_modules h set sort_order = r.rn
  from (
    select slug, row_number() over (
      order by coalesce(sort_order, 999), ((slug = p_slug) = v_down), name
    ) as rn
    from public.hub_modules
  ) r
  where r.slug = h.slug and h.sort_order is distinct from r.rn;

  if p_status = 'active' then
    perform public._ensure_module_plans(p_slug);
  end if;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'module_updated', jsonb_build_object(
    'module_key', p_slug,
    'before', jsonb_build_object('name', v_old.name, 'status', v_old.status, 'public', v_old.is_public_for_sale, 'sort', v_old.sort_order),
    'after', jsonb_build_object('name', trim(p_name), 'status', p_status, 'public', v_public, 'sort', coalesce(p_sort, v_old.sort_order)),
    'logo_changed', p_logo is not null,
    'texts_changed', (p_description is not null or p_features is not null)
  ));
end;
$fn$;

revoke all on function public.admin_update_hub_module(text, text, text, boolean, int, text, text, jsonb) from public, anon;
grant execute on function public.admin_update_hub_module(text, text, text, boolean, int, text, text, jsonb) to authenticated;

-- criação do módulo: já nasce com os planos base
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

  perform public._ensure_module_plans(v_slug);

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'module_created', jsonb_build_object('module_key', v_slug, 'name', v_name, 'status', p_status));

  return v_slug;
end;
$$;

-- catálogo do lojista com os textos do card
drop function if exists public.get_catalog_modules();

create or replace function public.get_catalog_modules()
returns table (slug text, name text, status text, is_public_for_sale boolean, logo_url text, sort_order int, description text, features jsonb)
language sql
stable
security definer
set search_path = public
as $fn$
  select h.slug::text, h.name::text, h.status::text, h.is_public_for_sale, h.logo_url::text, h.sort_order::int,
         h.description::text, h.features
  from public.hub_modules h
  where h.status in ('active', 'coming_soon')
  order by h.sort_order;
$fn$;

revoke all on function public.get_catalog_modules() from public, anon;
grant execute on function public.get_catalog_modules() to authenticated;

-- planos criados agora (módulos sem plano passam a ter os 3 base)
select public._ensure_module_plans(slug) from public.hub_modules where status = 'active';

select h.slug, h.status, (select count(*) from public.dynamic_plans p where p.module_slug = h.slug and not p.is_combo) as planos
from public.hub_modules h order by h.sort_order;