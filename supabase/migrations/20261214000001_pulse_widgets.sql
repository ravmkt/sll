-- Widgets (Pulse): tabelas no schema pulse; RPCs em public mantêm os nomes widgets_*
create schema if not exists pulse;

create or replace function pulse.widgets_can_manage(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.stores s where s.id = p_store_id and s.owner_user_id = auth.uid())
    or coalesce(public.is_superadmin(), false)
  );
$$;
revoke all on function pulse.widgets_can_manage(uuid) from public, anon, authenticated;

create table if not exists pulse.widget_styles (
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
create index if not exists widget_styles_store_idx on pulse.widget_styles(store_id, widget_type);
create unique index if not exists widget_styles_one_default
  on pulse.widget_styles(store_id, widget_type) where is_default;

create table if not exists pulse.ruler_settings (
  store_id   uuid primary key references public.stores(id) on delete cascade,
  active     boolean not null default false,
  title      text not null default '',
  tiers      jsonb not null default '[]'::jsonb,
  footer     text not null default '',
  placement  jsonb not null default '{"selector":"","position":"before"}'::jsonb,
  style_id   uuid references pulse.widget_styles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists pulse.picker_tokens (
  token      text primary key,
  store_id   uuid not null references public.stores(id) on delete cascade,
  selector   text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);

alter table pulse.widget_styles enable row level security;
alter table pulse.ruler_settings enable row level security;
alter table pulse.picker_tokens enable row level security;
-- sem policies: acesso apenas pelas RPCs security definer

create or replace function public.widgets_styles_list(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at)
                   from pulse.widget_styles s where s.store_id = p_store_id), '[]'::jsonb);
end $$;

create or replace function public.widgets_style_save(
  p_store_id uuid, p_id uuid, p_name text, p_primary_color text, p_config jsonb, p_is_default boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_def boolean := coalesce(p_is_default, false);
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'invalid_name'; end if;

  if not exists (select 1 from pulse.widget_styles
                  where store_id = p_store_id and widget_type = 'ruler' and is_default and id is distinct from p_id) then
    v_def := true;
  end if;
  if v_def then
    update pulse.widget_styles set is_default = false
     where store_id = p_store_id and widget_type = 'ruler' and id is distinct from p_id;
  end if;

  if p_id is null then
    insert into pulse.widget_styles(store_id, name, primary_color, config, is_default)
    values (p_store_id, trim(p_name), coalesce(p_primary_color, '#0094EB'), coalesce(p_config, '{}'::jsonb), v_def)
    returning id into v_id;
  else
    update pulse.widget_styles
       set name = trim(p_name), primary_color = coalesce(p_primary_color, primary_color),
           config = coalesce(p_config, config), is_default = v_def, updated_at = now()
     where id = p_id and store_id = p_store_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;
  return (select to_jsonb(s) from pulse.widget_styles s where s.id = v_id);
end $$;

create or replace function public.widgets_style_set_default(p_store_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  update pulse.widget_styles set is_default = false where store_id = p_store_id and widget_type = 'ruler';
  update pulse.widget_styles set is_default = true where id = p_id and store_id = p_store_id;
end $$;

create or replace function public.widgets_style_delete(p_store_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_was_default boolean;
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  delete from pulse.widget_styles where id = p_id and store_id = p_store_id
  returning is_default into v_was_default;
  if coalesce(v_was_default, false) then
    update pulse.widget_styles set is_default = true
     where id = (select id from pulse.widget_styles
                  where store_id = p_store_id and widget_type = 'ruler' order by created_at limit 1);
  end if;
end $$;

create or replace function public.widgets_ruler_get(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare r pulse.ruler_settings;
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  select * into r from pulse.ruler_settings where store_id = p_store_id;
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
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if jsonb_typeof(coalesce(p_tiers, '[]'::jsonb)) <> 'array' then raise exception 'invalid_tiers'; end if;
  insert into pulse.ruler_settings(store_id, active, title, tiers, footer, placement, style_id, updated_at)
  values (p_store_id, coalesce(p_active,false), coalesce(p_title,''), coalesce(p_tiers,'[]'::jsonb),
          coalesce(p_footer,''), coalesce(p_placement,'{"selector":"","position":"before"}'::jsonb), p_style_id, now())
  on conflict (store_id) do update
    set active = excluded.active, title = excluded.title, tiers = excluded.tiers, footer = excluded.footer,
        placement = excluded.placement, style_id = excluded.style_id, updated_at = now();
end $$;

-- leitura pública para o widgets-widget.js
create or replace function public.widgets_public_config(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare r pulse.ruler_settings; s pulse.widget_styles;
begin
  select * into r from pulse.ruler_settings where store_id = p_store_id and active;
  if not found then return null; end if;
  select * into s from pulse.widget_styles
   where store_id = p_store_id and widget_type = 'ruler'
     and (id = r.style_id or (r.style_id is null and is_default))
   order by (id = r.style_id) desc nulls last limit 1;
  return jsonb_build_object(
    'ruler', jsonb_build_object('title', r.title, 'tiers', r.tiers, 'footer', r.footer, 'placement', r.placement),
    'style', case when s.id is null then null else s.config end);
end $$;

-- seletor de elemento (picker)
create or replace function public.widgets_selector_create(p_store_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  delete from pulse.picker_tokens where expires_at < now();
  v_token := 'sel_' || replace(gen_random_uuid()::text, '-', '');
  insert into pulse.picker_tokens(token, store_id) values (v_token, p_store_id);
  return v_token;
end $$;

create or replace function public.widgets_selector_submit(p_token text, p_selector text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or p_token !~ '^sel_[0-9a-f]{32}$' then return false; end if;
  if p_selector is null or length(p_selector) = 0 or length(p_selector) > 500 then return false; end if;
  update pulse.picker_tokens set selector = p_selector
   where token = p_token and expires_at > now();
  return found;
end $$;

create or replace function public.widgets_selector_poll(p_store_id uuid, p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare v_sel text;
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  select selector into v_sel from pulse.picker_tokens
   where token = p_token and store_id = p_store_id and expires_at > now();
  if v_sel is not null then delete from pulse.picker_tokens where token = p_token; end if;
  return v_sel;
end $$;

revoke all on function public.widgets_styles_list(uuid) from public;
revoke all on function public.widgets_style_save(uuid,uuid,text,text,jsonb,boolean) from public;
revoke all on function public.widgets_style_set_default(uuid,uuid) from public;
revoke all on function public.widgets_style_delete(uuid,uuid) from public;
revoke all on function public.widgets_ruler_get(uuid) from public;
revoke all on function public.widgets_ruler_save(uuid,boolean,text,jsonb,text,jsonb,uuid) from public;
revoke all on function public.widgets_public_config(uuid) from public;
revoke all on function public.widgets_selector_create(uuid) from public;
revoke all on function public.widgets_selector_submit(text,text) from public;
revoke all on function public.widgets_selector_poll(uuid,text) from public;

grant execute on function public.widgets_styles_list(uuid) to authenticated;
grant execute on function public.widgets_style_save(uuid,uuid,text,text,jsonb,boolean) to authenticated;
grant execute on function public.widgets_style_set_default(uuid,uuid) to authenticated;
grant execute on function public.widgets_style_delete(uuid,uuid) to authenticated;
grant execute on function public.widgets_ruler_get(uuid) to authenticated;
grant execute on function public.widgets_ruler_save(uuid,boolean,text,jsonb,text,jsonb,uuid) to authenticated;
grant execute on function public.widgets_public_config(uuid) to anon, authenticated;
grant execute on function public.widgets_selector_create(uuid) to authenticated;
grant execute on function public.widgets_selector_poll(uuid,text) to authenticated;
grant execute on function public.widgets_selector_submit(text,text) to anon, authenticated;

notify pgrst, 'reload schema';