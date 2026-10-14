create or replace function public.admin_reorder_hub_modules(p_slugs text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p_slugs is null or coalesce(array_length(p_slugs, 1), 0) = 0 then
    raise exception 'Lista de módulos vazia.';
  end if;

  -- ativos sempre primeiro; dentro de cada grupo vale a ordem enviada
  update public.hub_modules h
     set sort_order = r.rn, updated_at = now()
    from (
      select m.slug, row_number() over (
        order by (m.status <> 'active'),
                 coalesce(array_position(p_slugs, m.slug), 9999),
                 coalesce(m.sort_order, 999),
                 m.name
      ) as rn
      from public.hub_modules m
    ) r
   where r.slug = h.slug and h.sort_order is distinct from r.rn;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'modules_reordered', jsonb_build_object('order', to_jsonb(p_slugs)));
end;
$$;

revoke all on function public.admin_reorder_hub_modules(text[]) from public, anon;
grant execute on function public.admin_reorder_hub_modules(text[]) to authenticated;

select slug, status, sort_order from public.hub_modules order by sort_order;