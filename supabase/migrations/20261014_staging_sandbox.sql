-- Loja sandbox (apenas uma)
alter table public.stores add column if not exists is_sandbox boolean not null default false;
create unique index if not exists uq_stores_single_sandbox on public.stores (is_sandbox) where is_sandbox;

-- Configuracoes em duas versoes: teste e ao vivo
create table if not exists public.staging_configs (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  entity_key text not null,
  live_config jsonb not null default '{}'::jsonb,
  test_config jsonb,
  test_saved_at timestamptz,
  published_at timestamptz,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, entity_key)
);

create or replace function public.staging_is_master()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r boolean := false;
begin
  begin
    if coalesce((auth.jwt() -> 'app_metadata' ->> 'is_superadmin')::boolean, false) then return true; end if;
  exception when others then null;
  end;
  begin
    if to_regclass('public.admin_superusers') is not null then
      execute 'select exists (select 1 from public.admin_superusers where user_id = auth.uid())' into r;
    end if;
  exception when others then r := false;
  end;
  return coalesce(r, false);
end $$;
grant execute on function public.staging_is_master() to authenticated;

alter table public.staging_configs enable row level security;
drop policy if exists staging_configs_master on public.staging_configs;
create policy staging_configs_master on public.staging_configs
  for all to authenticated using (public.staging_is_master()) with check (public.staging_is_master());

-- Leitura pela loja/widget: sandbox le teste (fallback ao vivo); demais lojas leem so o ao vivo
create or replace function public.staging_get_config(p_scope text, p_key text, p_store_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.staging_configs; v_sandbox boolean := false;
begin
  select * into r from public.staging_configs where scope = p_scope and entity_key = p_key;
  if not found then return null; end if;
  if p_store_id is not null then
    select s.is_sandbox into v_sandbox from public.stores s where s.id = p_store_id;
  end if;
  if coalesce(v_sandbox, false) then return coalesce(r.test_config, r.live_config); end if;
  return r.live_config;
end $$;
grant execute on function public.staging_get_config(text, text, uuid) to anon, authenticated;

-- Master: estado completo
create or replace function public.admin_staging_get(p_scope text, p_key text)
returns table (live_config jsonb, test_config jsonb, has_draft boolean, test_saved_at timestamptz, published_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.staging_is_master() then raise exception 'FORBIDDEN'; end if;
  return query
    select c.live_config, c.test_config,
           (c.test_config is not null and c.test_config is distinct from c.live_config),
           c.test_saved_at, c.published_at
    from public.staging_configs c where c.scope = p_scope and c.entity_key = p_key;
end $$;
grant execute on function public.admin_staging_get(text, text) to authenticated;

-- Master: aplicar na loja teste (nao altera o ao vivo)
create or replace function public.admin_staging_save_test(p_scope text, p_key text, p_config jsonb, p_seed_live jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.staging_is_master() then raise exception 'FORBIDDEN'; end if;
  insert into public.staging_configs (scope, entity_key, live_config, test_config, test_saved_at, updated_by)
  values (p_scope, p_key, coalesce(p_seed_live, '{}'::jsonb), p_config, now(), auth.uid())
  on conflict (scope, entity_key) do update
    set test_config = excluded.test_config, test_saved_at = now(), updated_by = auth.uid(), updated_at = now();
end $$;
grant execute on function public.admin_staging_save_test(text, text, jsonb, jsonb) to authenticated;

-- Master: publicar ao vivo (live = test; ambos ficam iguais)
create or replace function public.admin_staging_publish(p_scope text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.staging_is_master() then raise exception 'FORBIDDEN'; end if;
  update public.staging_configs
     set live_config = test_config, published_at = now(), updated_by = auth.uid(), updated_at = now()
   where scope = p_scope and entity_key = p_key and test_config is not null;
  if not found then raise exception 'SEM_RASCUNHO'; end if;
end $$;
grant execute on function public.admin_staging_publish(text, text) to authenticated;

-- Master: descartar o rascunho (test volta a ser igual ao live)
create or replace function public.admin_staging_discard(p_scope text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.staging_is_master() then raise exception 'FORBIDDEN'; end if;
  update public.staging_configs set test_config = live_config, test_saved_at = now(), updated_at = now()
   where scope = p_scope and entity_key = p_key;
end $$;
grant execute on function public.admin_staging_discard(text, text) to authenticated;

-- Master: definir a loja sandbox (null remove)
create or replace function public.admin_set_sandbox_store(p_store_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.staging_is_master() then raise exception 'FORBIDDEN'; end if;
  update public.stores set is_sandbox = false where is_sandbox;
  if p_store_id is not null then update public.stores set is_sandbox = true where id = p_store_id; end if;
end $$;
grant execute on function public.admin_set_sandbox_store(uuid) to authenticated;

-- Master: lojas e dados da sandbox (url lida de forma tolerante a nome de coluna)
create or replace function public.admin_staging_list_stores()
returns table (id uuid, name text, is_sandbox boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.staging_is_master() then raise exception 'FORBIDDEN'; end if;
  return query select s.id, s.name::text, s.is_sandbox from public.stores s order by s.name;
end $$;
grant execute on function public.admin_staging_list_stores() to authenticated;

create or replace function public.admin_staging_sandbox()
returns table (id uuid, name text, url text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.staging_is_master() then raise exception 'FORBIDDEN'; end if;
  return query
    select s.id, s.name::text,
           coalesce(to_jsonb(s)->>'store_url', to_jsonb(s)->>'url', to_jsonb(s)->>'website', to_jsonb(s)->>'domain')
    from public.stores s where s.is_sandbox limit 1;
end $$;
grant execute on function public.admin_staging_sandbox() to authenticated;

select to_regclass('public.staging_configs') as tabela,
       (select count(*) from public.stores where is_sandbox) as sandboxes;