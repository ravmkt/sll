alter table public.hub_modules add column if not exists logo_url text;

-- resolve empates de ordem existentes (1, 2, 3...)
update public.hub_modules h set sort_order = r.rn
from (select slug, row_number() over (order by coalesce(sort_order, 999), name) as rn from public.hub_modules) r
where r.slug = h.slug;

-- bucket publico para os logos (somente superadmin grava)
insert into storage.buckets (id, name, public) values ('module-logos', 'module-logos', true)
on conflict (id) do nothing;

drop policy if exists "module_logos_admin_write" on storage.objects;
create policy "module_logos_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'module-logos' and public.is_superadmin())
  with check (bucket_id = 'module-logos' and public.is_superadmin());

drop function if exists public.admin_update_hub_module(text, text, text, boolean, int);

create or replace function public.admin_update_hub_module(
  p_slug text, p_name text, p_status text, p_public boolean, p_sort int, p_logo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  if p_status not in ('active', 'coming_soon') then
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

  -- renumera: o módulo editado ocupa a posição pedida e os demais se ajustam
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
$$;

revoke all on function public.admin_update_hub_module(text, text, text, boolean, int, text) from public, anon;
grant execute on function public.admin_update_hub_module(text, text, text, boolean, int, text) to authenticated;

select slug, name, sort_order, logo_url from public.hub_modules order by sort_order;