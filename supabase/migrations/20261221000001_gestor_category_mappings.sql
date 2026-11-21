-- Vinculo entre categorias dos canais (Yampi etc.) e categorias do Gestor

alter table public.products add column if not exists channel_category text;

create or replace function public.norm_cat(p text)
returns text language sql immutable as $$
  select nullif(regexp_replace(translate(lower(btrim(coalesce(p, ''))),
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '\s+', ' ', 'g'), '');
$$;

create table if not exists erp.category_mappings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  channel text not null,
  external_name text not null,
  external_key text not null,
  category_id uuid not null references public.product_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_category_mappings on erp.category_mappings (store_id, channel, external_key);
alter table erp.category_mappings enable row level security;
drop policy if exists category_mappings_select on erp.category_mappings;
create policy category_mappings_select on erp.category_mappings for select
  using (public.is_store_owner_or_member(store_id));
grant select on erp.category_mappings to authenticated;
grant all on erp.category_mappings to service_role;

-- Aplica os vinculos aos produtos do canal
create or replace function erp.category_map_apply(p_store uuid, p_channel text)
returns integer language plpgsql security definer set search_path = public, erp as $$
declare n integer;
begin
  update public.products p
     set category_id = m.category_id, category = c.name
    from erp.category_mappings m
    join public.product_categories c on c.id = m.category_id
   where p.store_id = p_store and m.store_id = p_store and m.channel = p_channel
     and p.source_platform = p_channel
     and public.norm_cat(p.channel_category) = m.external_key
     and (p.category_id is distinct from m.category_id or p.category is distinct from c.name);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function erp.category_map_apply(uuid, text) from public, anon, authenticated;

-- Vincula por nome igual (a categoria mais antiga ganha se houver nomes repetidos)
create or replace function erp.category_map_auto(p_store uuid, p_channel text)
returns integer language plpgsql security definer set search_path = public, erp as $$
declare n integer;
begin
  with ext as (
    select distinct on (public.norm_cat(channel_category))
           channel_category as name, public.norm_cat(channel_category) as key
      from public.products
     where store_id = p_store and source_platform = p_channel and channel_category is not null
     order by public.norm_cat(channel_category), channel_category
  )
  insert into erp.category_mappings (store_id, channel, external_name, external_key, category_id)
  select p_store, p_channel, e.name, e.key, t.id
    from ext e
    join lateral (
      select c.id from public.product_categories c
       where c.store_id = p_store and coalesce(c.active, true) and public.norm_cat(c.name) = e.key
       order by c.created_at limit 1
    ) t on true
   where e.key is not null
  on conflict (store_id, channel, external_key) do nothing;
  get diagnostics n = row_count;
  perform erp.category_map_apply(p_store, p_channel);
  return n;
end $$;
revoke all on function erp.category_map_auto(uuid, text) from public, anon, authenticated;

-- RPCs da tela
create or replace function public.gestor_category_channels(p_store uuid)
returns table(channel text, external_name text, products integer, category_id uuid, category_name text)
language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query
    select p.source_platform::text, p.channel_category, count(*)::integer, m.category_id, c.name
      from public.products p
      left join erp.category_mappings m
        on m.store_id = p.store_id and m.channel = p.source_platform
       and m.external_key = public.norm_cat(p.channel_category)
      left join public.product_categories c on c.id = m.category_id
     where p.store_id = p_store and p.source_platform is not null and p.channel_category is not null
     group by p.source_platform, p.channel_category, m.category_id, c.name
     order by p.source_platform, p.channel_category;
end $$;
revoke all on function public.gestor_category_channels(uuid) from public, anon;
grant execute on function public.gestor_category_channels(uuid) to authenticated;

create or replace function public.gestor_category_map_save(
  p_store uuid, p_channel text, p_external text, p_category uuid)
returns integer language plpgsql security definer set search_path = public, erp as $$
declare v_key text := public.norm_cat(p_external); n integer := 0;
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  if v_key is null then raise exception 'Categoria do canal invalida'; end if;
  if p_category is null then
    delete from erp.category_mappings where store_id = p_store and channel = p_channel and external_key = v_key;
    update public.products set category_id = null, category = channel_category
     where store_id = p_store and source_platform = p_channel and public.norm_cat(channel_category) = v_key;
    get diagnostics n = row_count;
    return n;
  end if;
  if not exists (select 1 from public.product_categories where id = p_category and store_id = p_store) then
    raise exception 'Categoria do Gestor nao encontrada';
  end if;
  insert into erp.category_mappings (store_id, channel, external_name, external_key, category_id)
  values (p_store, p_channel, btrim(p_external), v_key, p_category)
  on conflict (store_id, channel, external_key)
  do update set category_id = excluded.category_id, external_name = excluded.external_name, updated_at = now();
  return erp.category_map_apply(p_store, p_channel);
end $$;
revoke all on function public.gestor_category_map_save(uuid, text, text, uuid) from public, anon;
grant execute on function public.gestor_category_map_save(uuid, text, text, uuid) to authenticated;

create or replace function public.gestor_category_map_auto(p_store uuid, p_channel text)
returns integer language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  return erp.category_map_auto(p_store, p_channel);
end $$;
revoke all on function public.gestor_category_map_auto(uuid, text) from public, anon;
grant execute on function public.gestor_category_map_auto(uuid, text) to authenticated;

-- Produto novo ou importado ja entra com a categoria do Gestor
create or replace function public.trg_products_category_map()
returns trigger language plpgsql security definer set search_path = public, erp as $$
declare v_ch text := nullif(new.source_platform, ''); v_cat uuid; v_name text;
begin
  if v_ch is null then return new; end if;
  if new.channel_category is null and new.category is not null then
    new.channel_category := new.category;
  end if;
  if new.category_id is null and new.channel_category is not null then
    select m.category_id, c.name into v_cat, v_name
      from erp.category_mappings m
      join public.product_categories c on c.id = m.category_id
     where m.store_id = new.store_id and m.channel = v_ch
       and m.external_key = public.norm_cat(new.channel_category);
    if v_cat is not null then new.category_id := v_cat; new.category := v_name; end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_products_category_map on public.products;
create trigger trg_products_category_map
  before insert or update of category, category_id, source_platform on public.products
  for each row execute function public.trg_products_category_map();

-- Carga inicial: guarda o nome original do canal e vincula os nomes iguais
update public.products set channel_category = category
 where source_platform is not null and channel_category is null and category is not null;

do $$
declare r record;
begin
  for r in select distinct store_id, source_platform from public.products where source_platform is not null loop
    perform erp.category_map_auto(r.store_id, r.source_platform);
  end loop;
end $$;

notify pgrst, 'reload schema';

select
  (select count(*) from erp.category_mappings) as vinculos,
  (select count(*) from public.products
    where source_platform is not null and channel_category is not null and category_id is null) as produtos_sem_vinculo,
  (select count(*) from (select store_id, public.norm_cat(name) from public.product_categories
                          group by 1, 2 having count(*) > 1) d) as nomes_repetidos_no_gestor;