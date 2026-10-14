-- Rascunhos de modulos visiveis apenas para a loja sandbox
create or replace function public.staging_module_overrides(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.stores s where s.id = p_store_id and s.is_sandbox) then
    return '{}'::jsonb;
  end if;
  return coalesce((
    select jsonb_object_agg(c.entity_key, c.test_config)
    from public.staging_configs c
    where c.scope = 'module' and c.test_config is not null
  ), '{}'::jsonb);
end $$;
grant execute on function public.staging_module_overrides(uuid) to authenticated;

select to_regclass('public.staging_configs') as tabela_staging,
       (select count(*) from information_schema.columns where table_name = 'stores' and column_name = 'is_sandbox') as coluna_sandbox;