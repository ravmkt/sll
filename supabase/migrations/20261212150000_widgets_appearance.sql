create schema if not exists widgets;

create table if not exists widgets.widget_styles (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  widget_type   text not null default 'ruler',
  name          text not null,
  primary_color text not null default '#0094EB',
  config        jsonb not null default '{}'::jsonb,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists widget_styles_store_idx on widgets.widget_styles(store_id, widget_type);
create unique index if not exists widget_styles_one_default
  on widgets.widget_styles(store_id, widget_type) where is_default;

create table if not exists widgets.ruler_settings (
  store_id   uuid primary key references public.stores(id) on delete cascade,
  active     boolean not null default false,
  title      text not null default '',
  tiers      jsonb not null default '[]'::jsonb,
  footer     text not null default '',
  placement  jsonb not null default '{"selector":"","position":"before"}'::jsonb,
  style_id   uuid references widgets.widget_styles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table widgets.widget_styles enable row level security;
alter table widgets.ruler_settings enable row level security;
-- sem policies: acesso apenas pelas RPCs security definer

create or replace function widgets._can_manage(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.stores s where s.id = p_store_id and s.owner_user_id = auth.uid())
    or coalesce(public.is_superadmin(), false)
  );
$$;
revoke all on function widgets._can_manage(uuid) from public, anon, authenticated;

create or replace function public.widgets_styles_list(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at)
                   from widgets.widget_styles s where s.store_id = p_store_id), '[]'::jsonb);
end $$;

create or replace function public.widgets_style_save(
  p_store_id uuid, p_id uuid, p_name text, p_primary_color text, p_config jsonb, p_is_default boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_def boolean := coalesce(p_is_default, false);
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'invalid_name'; end if;

  if not exists (select 1 from widgets.widget_styles
                  where store_id = p_store_id and widget_type = 'ruler' and is_default and id is distinct from p_id) then
    v_def := true;
  end if;
  if v_def then
    update widgets.widget_styles set is_default = false
     where store_id = p_store_id and widget_type = 'ruler' and id is distinct from p_id;
  end if;

  if p_id is null then
    insert into widgets.widget_styles(store_id, name, primary_color, config, is_default)
    values (p_store_id, trim(p_name), coalesce(p_primary_color, '#0094EB'), coalesce(p_config, '{}'::jsonb), v_def)
    returning id into v_id;
  else
    update widgets.widget_styles
       set name = trim(p_name), primary_color = coalesce(p_primary_color, primary_color),
           config = coalesce(p_config, config), is_default = v_def, updated_at = now()
     where id = p_id and store_id = p_store_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;
  return (select to_jsonb(s) from widgets.widget_styles s where s.id = v_id);
end $$;

create or replace function public.widgets_style_set_default(p_store_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  update widgets.widget_styles set is_default = false where store_id = p_store_id and widget_type = 'ruler';
  update widgets.widget_styles set is_default = true where id = p_id and store_id = p_store_id;
end $$;

create or replace function public.widgets_style_delete(p_store_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_was_default boolean;
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  delete from widgets.widget_styles where id = p_id and store_id = p_store_id
  returning is_default into v_was_default;
  if coalesce(v_was_default, false) then
    update widgets.widget_styles set is_default = true
     where id = (select id from widgets.widget_styles
                  where store_id = p_store_id and widget_type = 'ruler' order by created_at limit 1);
  end if;
end $$;

create or replace function public.widgets_ruler_get(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare r widgets.ruler_settings;
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  select * into r from widgets.ruler_settings where store_id = p_store_id;
  if not found then
    return jsonb_build_object('store_id', p_store_id, 'active', false, 'title', '', 'tiers', '[]'::jsonb,
                              'footer', '', 'placement', '{"selector":"","position":"before"}'::jsonb, 'style_id', null);
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.widgets_ruler_save(
  p_store_id uuid, p_active boolean, p_title text, p_tiers jsonb, p_footer text, p_placement jsonb, p_style_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if jsonb_typeof(coalesce(p_tiers, '[]'::jsonb)) <> 'array' then raise exception 'invalid_tiers'; end if;
  insert into widgets.ruler_settings(store_id, active, title, tiers, footer, placement, style_id, updated_at)
  values (p_store_id, coalesce(p_active,false), coalesce(p_title,''), coalesce(p_tiers,'[]'::jsonb),
          coalesce(p_footer,''), coalesce(p_placement,'{"selector":"","position":"before"}'::jsonb), p_style_id, now())
  on conflict (store_id) do update
    set active = excluded.active, title = excluded.title, tiers = excluded.tiers, footer = excluded.footer,
        placement = excluded.placement, style_id = excluded.style_id, updated_at = now();
end $$;

-- Leitura pública para o widgets-widget.js (só retorna se módulo ativo e régua ativa)
create or replace function public.widgets_public_config(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare r widgets.ruler_settings; s widgets.widget_styles;
begin
  if not (public.get_store_active_modules(p_store_id) ? 'widgets') then return null; end if;
  select * into r from widgets.ruler_settings where store_id = p_store_id and active;
  if not found then return null; end if;
  select * into s from widgets.widget_styles
   where store_id = p_store_id and widget_type = 'ruler'
     and (id = r.style_id or (r.style_id is null and is_default))
   order by (id = r.style_id) desc nulls last limit 1;
  return jsonb_build_object(
    'ruler', jsonb_build_object('title', r.title, 'tiers', r.tiers, 'footer', r.footer, 'placement', r.placement),
    'style', case when s.id is null then null else s.config end);
end $$;

revoke all on function public.widgets_styles_list(uuid) from public;
revoke all on function public.widgets_style_save(uuid,uuid,text,text,jsonb,boolean) from public;
revoke all on function public.widgets_style_set_default(uuid,uuid) from public;
revoke all on function public.widgets_style_delete(uuid,uuid) from public;
revoke all on function public.widgets_ruler_get(uuid) from public;
revoke all on function public.widgets_ruler_save(uuid,boolean,text,jsonb,text,jsonb,uuid) from public;
revoke all on function public.widgets_public_config(uuid) from public;
grant execute on function public.widgets_styles_list(uuid) to authenticated;
grant execute on function public.widgets_style_save(uuid,uuid,text,text,jsonb,boolean) to authenticated;
grant execute on function public.widgets_style_set_default(uuid,uuid) to authenticated;
grant execute on function public.widgets_style_delete(uuid,uuid) to authenticated;
grant execute on function public.widgets_ruler_get(uuid) to authenticated;
grant execute on function public.widgets_ruler_save(uuid,boolean,text,jsonb,text,jsonb,uuid) to authenticated;
grant execute on function public.widgets_public_config(uuid) to anon, authenticated;
