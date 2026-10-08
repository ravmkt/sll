create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  module_slug text not null,
  key text not null,
  name text not null,
  description text,
  mode text not null default 'stores' check (mode in ('off', 'stores', 'all')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_slug, key)
);

create table if not exists public.feature_flag_stores (
  flag_id uuid not null references public.feature_flags(id) on delete cascade,
  store_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (flag_id, store_id)
);

alter table public.feature_flags enable row level security;
alter table public.feature_flag_stores enable row level security;

drop policy if exists "feature_flags_superadmin" on public.feature_flags;
create policy "feature_flags_superadmin" on public.feature_flags
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "feature_flag_stores_superadmin" on public.feature_flag_stores;
create policy "feature_flag_stores_superadmin" on public.feature_flag_stores
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

create or replace function public.admin_list_feature_flags(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id, 'module_slug', f.module_slug, 'key', f.key, 'name', f.name,
      'description', f.description, 'mode', f.mode,
      'stores', coalesce((
        select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name)
        from public.feature_flag_stores fs
        join public.stores s on s.id = fs.store_id
        where fs.flag_id = f.id
      ), '[]'::jsonb)
    ) order by f.created_at)
    from public.feature_flags f
    where f.module_slug = p_slug
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_save_feature_flag(
  p_id uuid, p_slug text, p_key text, p_name text, p_description text, p_mode text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_key text := lower(trim(coalesce(p_key, '')));
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if p_mode not in ('off', 'stores', 'all') then
    raise exception 'Modo inválido.';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Informe o nome da flag.';
  end if;

  if p_id is null then
    if v_key !~ '^[a-z0-9_]+$' then
      raise exception 'Chave inválida. Use letras minúsculas, números e _.';
    end if;
    if exists (select 1 from public.feature_flags where module_slug = p_slug and key = v_key) then
      raise exception 'Já existe uma flag com essa chave neste módulo.';
    end if;
    insert into public.feature_flags (module_slug, key, name, description, mode)
    values (p_slug, v_key, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_mode)
    returning id into v_id;
    insert into public.admin_audit_logs (admin_id, action, details)
    values (auth.uid(), 'feature_flag_created', jsonb_build_object('module_key', p_slug, 'flag', v_key, 'mode', p_mode));
  else
    update public.feature_flags
       set name = trim(p_name),
           description = nullif(trim(coalesce(p_description, '')), ''),
           mode = p_mode,
           updated_at = now()
     where id = p_id
     returning id into v_id;
    if v_id is null then
      raise exception 'Flag não encontrada.';
    end if;
    insert into public.admin_audit_logs (admin_id, action, details)
    values (auth.uid(), 'feature_flag_updated', jsonb_build_object('flag_id', p_id, 'mode', p_mode));
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_delete_feature_flag(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_slug text;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  delete from public.feature_flags where id = p_id returning key, module_slug into v_key, v_slug;
  if v_key is null then
    raise exception 'Flag não encontrada.';
  end if;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'feature_flag_deleted', jsonb_build_object('module_key', v_slug, 'flag', v_key));
end;
$$;

create or replace function public.admin_set_flag_store(p_flag_id uuid, p_store_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.feature_flags where id = p_flag_id) then
    raise exception 'Flag não encontrada.';
  end if;
  if p_enabled then
    insert into public.feature_flag_stores (flag_id, store_id) values (p_flag_id, p_store_id)
    on conflict do nothing;
  else
    delete from public.feature_flag_stores where flag_id = p_flag_id and store_id = p_store_id;
  end if;
  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'feature_flag_store', jsonb_build_object('flag_id', p_flag_id, 'store_id', p_store_id, 'enabled', p_enabled));
end;
$$;

create or replace function public.store_feature_flags(p_store_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_superadmin()
          or exists (select 1 from public.stores where id = p_store_id and owner_id = auth.uid())) then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select array_agg(f.module_slug || ':' || f.key)
    from public.feature_flags f
    where f.mode = 'all'
       or (f.mode = 'stores' and exists (
            select 1 from public.feature_flag_stores fs
            where fs.flag_id = f.id and fs.store_id = p_store_id))
  ), '{}'::text[]);
end;
$$;

revoke all on function public.admin_list_feature_flags(text) from public, anon;
revoke all on function public.admin_save_feature_flag(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.admin_delete_feature_flag(uuid) from public, anon;
revoke all on function public.admin_set_flag_store(uuid, uuid, boolean) from public, anon;
revoke all on function public.store_feature_flags(uuid) from public, anon;
grant execute on function public.admin_list_feature_flags(text) to authenticated;
grant execute on function public.admin_save_feature_flag(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_delete_feature_flag(uuid) to authenticated;
grant execute on function public.admin_set_flag_store(uuid, uuid, boolean) to authenticated;
grant execute on function public.store_feature_flags(uuid) to authenticated;