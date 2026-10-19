-- Versiona funcao criada direto no SQL Editor (selecao de lojas do NPS)
create or replace function public.admin_nps_list_stores()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name)
                   from public.stores), '[]'::jsonb);
end $function$;