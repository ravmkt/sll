-- Tipos de usuario por loja (preenchem funcao base, escopo e permissoes padrao)

create table if not exists public.store_member_types (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  role text not null check (role in ('operador','financeiro','vendedor','contador')),
  scope text not null default 'all' check (scope in ('all','own')),
  has_commission boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_member_types_name on public.store_member_types (store_id, lower(name));

alter table public.store_member_types enable row level security;
drop policy if exists member_types_select on public.store_member_types;
create policy member_types_select on public.store_member_types for select
  using (public.is_store_owner_or_member(store_id));
grant select on public.store_member_types to authenticated;
grant all on public.store_member_types to service_role;

alter table public.store_members
  add column if not exists type_id uuid references public.store_member_types(id) on delete set null;

create or replace function public.gestor_is_manager(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select auth.uid() is not null and (
    exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid())
    or public.is_superadmin()
    or exists (select 1 from public.store_members m
               where m.store_id = p_store and m.user_id = auth.uid()
                 and coalesce(m.active, true) and m.role in ('owner','admin'))
  );
$fn$;
revoke all on function public.gestor_is_manager(uuid) from public, anon;
grant execute on function public.gestor_is_manager(uuid) to authenticated;

create or replace function public.gestor_member_types_seed(p_store uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if exists (select 1 from public.store_member_types where store_id = p_store) then return; end if;
  insert into public.store_member_types (store_id, name, role, scope, has_commission, permissions, is_system, sort_order) values
    (p_store, 'Comum', 'operador', 'all', false,
      '{"produtos":["ver"],"estoque":["ver"],"pedidos":["ver"],"clientes":["ver"]}'::jsonb, true, 1),
    (p_store, 'Suporte técnico', 'operador', 'all', false,
      '{"produtos":["ver"],"estoque":["ver"],"pedidos":["ver","editar"],"clientes":["ver","editar"],"expedicao":["ver"]}'::jsonb, true, 2),
    (p_store, 'Financeiro', 'financeiro', 'all', false,
      '{"fornecedores":["ver"],"pedidos":["ver","exportar"],"clientes":["ver"],"financeiro":["ver","criar","editar","exportar"],"notas_fiscais":["ver","exportar"],"relatorios":["ver","exportar"]}'::jsonb, true, 3),
    (p_store, 'Contador', 'contador', 'all', false,
      '{"pedidos":["ver","exportar"],"financeiro":["ver","exportar"],"notas_fiscais":["ver","exportar"],"relatorios":["ver","exportar"]}'::jsonb, true, 4),
    (p_store, 'Vendedor', 'vendedor', 'own', true,
      '{"produtos":["ver"],"estoque":["ver"],"pedidos":["ver","criar","editar"],"clientes":["ver","criar","editar"]}'::jsonb, true, 5);
end $fn$;
revoke all on function public.gestor_member_types_seed(uuid) from public, anon, authenticated;

create or replace function public.gestor_member_types(p_store uuid)
returns setof public.store_member_types language plpgsql security definer set search_path = public as $fn$
begin
  if not public.gestor_is_manager(p_store) then raise exception 'Sem permissao para gerenciar a equipe'; end if;
  perform public.gestor_member_types_seed(p_store);
  return query select * from public.store_member_types where store_id = p_store order by sort_order, name;
end $fn$;
revoke all on function public.gestor_member_types(uuid) from public, anon;
grant execute on function public.gestor_member_types(uuid) to authenticated;

create or replace function public.gestor_member_type_save(
  p_store uuid, p_id uuid, p_name text, p_role text, p_scope text,
  p_commission boolean, p_permissions jsonb, p_active boolean)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_name text := btrim(coalesce(p_name, ''));
begin
  if not public.gestor_is_manager(p_store) then raise exception 'Sem permissao para gerenciar a equipe'; end if;
  if v_name = '' then raise exception 'Informe o nome do tipo'; end if;
  if p_role not in ('operador','financeiro','vendedor','contador') then raise exception 'Perfil base invalido'; end if;
  if p_scope not in ('all','own') then raise exception 'Escopo invalido'; end if;
  if p_id is null then
    insert into public.store_member_types (store_id, name, role, scope, has_commission, permissions, active, sort_order)
    values (p_store, v_name, p_role, p_scope, coalesce(p_commission, false), coalesce(p_permissions, '{}'::jsonb),
            coalesce(p_active, true),
            coalesce((select max(sort_order) from public.store_member_types where store_id = p_store), 0) + 1)
    returning id into v_id;
  else
    update public.store_member_types
       set name = v_name, role = p_role, scope = p_scope, has_commission = coalesce(p_commission, false),
           permissions = coalesce(p_permissions, '{}'::jsonb), active = coalesce(p_active, true)
     where id = p_id and store_id = p_store
    returning id into v_id;
    if v_id is null then raise exception 'Tipo nao encontrado'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'Ja existe um tipo com esse nome';
end $fn$;
revoke all on function public.gestor_member_type_save(uuid, uuid, text, text, text, boolean, jsonb, boolean) from public, anon;
grant execute on function public.gestor_member_type_save(uuid, uuid, text, text, text, boolean, jsonb, boolean) to authenticated;

create or replace function public.gestor_member_type_delete(p_store uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_sys boolean; v_n integer;
begin
  if not public.gestor_is_manager(p_store) then raise exception 'Sem permissao para gerenciar a equipe'; end if;
  select is_system into v_sys from public.store_member_types where id = p_id and store_id = p_store;
  if not found then raise exception 'Tipo nao encontrado'; end if;
  if v_sys then raise exception 'Tipos padrao nao podem ser excluidos. Desative se nao quiser usar.'; end if;
  select count(*) into v_n from public.store_members where type_id = p_id;
  if v_n > 0 then raise exception 'Este tipo tem % usuario(s). Mude o tipo deles antes de excluir.', v_n; end if;
  delete from public.store_member_types where id = p_id and store_id = p_store;
end $fn$;
revoke all on function public.gestor_member_type_delete(uuid, uuid) from public, anon;
grant execute on function public.gestor_member_type_delete(uuid, uuid) to authenticated;

create or replace function public.gestor_member_set_type(p_store uuid, p_user uuid, p_type uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.gestor_is_manager(p_store) then raise exception 'Sem permissao para gerenciar a equipe'; end if;
  if p_type is not null and not exists (select 1 from public.store_member_types where id = p_type and store_id = p_store) then
    raise exception 'Tipo invalido';
  end if;
  update public.store_members set type_id = p_type, updated_at = now()
   where store_id = p_store and user_id = p_user and role <> 'owner';
end $fn$;
revoke all on function public.gestor_member_set_type(uuid, uuid, uuid) from public, anon;
grant execute on function public.gestor_member_set_type(uuid, uuid, uuid) to authenticated;

-- Carga inicial: tipos padrao em todas as lojas e tipo dos usuarios atuais
do $do$
declare s record;
begin
  for s in select id from public.stores loop
    perform public.gestor_member_types_seed(s.id);
  end loop;
end $do$;

update public.store_members m
   set type_id = t.id
  from public.store_member_types t
 where t.store_id = m.store_id and t.is_system and m.type_id is null
   and t.name = case m.role
     when 'operador' then 'Comum'
     when 'financeiro' then 'Financeiro'
     when 'vendedor' then 'Vendedor'
     when 'contador' then 'Contador' end;

notify pgrst, 'reload schema';

select
  (select count(*) from public.store_member_types) as tipos,
  (select count(*) from public.store_members where role not in ('owner','admin') and type_id is null) as usuarios_sem_tipo;