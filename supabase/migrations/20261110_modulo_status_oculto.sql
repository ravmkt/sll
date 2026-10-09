-- 1) novo status 'hidden' (Oculto)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.hub_modules'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.hub_modules drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.hub_modules
  add constraint hub_modules_status_check
  check (status in ('active', 'coming_soon', 'maintenance', 'hidden'));

-- 2) Master passa a aceitar 'hidden'
create or replace function public.admin_update_hub_module(
  p_slug text, p_name text, p_status text, p_public boolean, p_sort int, p_logo text default null
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

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'module_updated', jsonb_build_object(
    'module_key', p_slug,
    'before', jsonb_build_object('name', v_old.name, 'status', v_old.status, 'public', v_old.is_public_for_sale, 'sort', v_old.sort_order),
    'after', jsonb_build_object('name', trim(p_name), 'status', p_status, 'public', v_public, 'sort', coalesce(p_sort, v_old.sort_order)),
    'logo_changed', p_logo is not null
  ));
end;
$fn$;

revoke all on function public.admin_update_hub_module(text, text, text, boolean, int, text) from public, anon;
grant execute on function public.admin_update_hub_module(text, text, text, boolean, int, text) to authenticated;

-- 3) catálogo para o lojista: nunca devolve módulos ocultos
create or replace function public.get_catalog_modules()
returns table (slug text, name text, status text, is_public_for_sale boolean, logo_url text, sort_order int)
language sql
stable
security definer
set search_path = public
as $fn$
  select h.slug::text, h.name::text, h.status::text, h.is_public_for_sale, h.logo_url::text, h.sort_order::int
  from public.hub_modules h
  where h.status in ('active', 'coming_soon')
  order by h.sort_order;
$fn$;

revoke all on function public.get_catalog_modules() from public, anon;
grant execute on function public.get_catalog_modules() to authenticated;

select slug, status, is_public_for_sale from public.hub_modules order by sort_order;