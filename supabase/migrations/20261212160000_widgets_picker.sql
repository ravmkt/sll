create table if not exists widgets.picker_tokens (
  token      text primary key,
  store_id   uuid not null references public.stores(id) on delete cascade,
  selector   text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
alter table widgets.picker_tokens enable row level security;

create or replace function public.widgets_selector_create(p_store_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  delete from widgets.picker_tokens where expires_at < now();
  v_token := 'sel_' || replace(gen_random_uuid()::text, '-', '');
  insert into widgets.picker_tokens(token, store_id) values (v_token, p_store_id);
  return v_token;
end $$;

create or replace function public.widgets_selector_submit(p_token text, p_selector text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or p_token !~ '^sel_[0-9a-f]{32}$' then return false; end if;
  if p_selector is null or length(p_selector) = 0 or length(p_selector) > 500 then return false; end if;
  update widgets.picker_tokens set selector = p_selector
   where token = p_token and expires_at > now();
  return found;
end $$;

create or replace function public.widgets_selector_poll(p_store_id uuid, p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare v_sel text;
begin
  if not widgets._can_manage(p_store_id) then raise exception 'forbidden'; end if;
  select selector into v_sel from widgets.picker_tokens
   where token = p_token and store_id = p_store_id and expires_at > now();
  if v_sel is not null then delete from widgets.picker_tokens where token = p_token; end if;
  return v_sel;
end $$;

create or replace function public.widgets_public_config(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare r widgets.ruler_settings; s widgets.widget_styles;
begin
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

revoke all on function public.widgets_selector_create(uuid) from public;
revoke all on function public.widgets_selector_submit(text,text) from public;
revoke all on function public.widgets_selector_poll(uuid,text) from public;
grant execute on function public.widgets_selector_create(uuid) to authenticated;
grant execute on function public.widgets_selector_poll(uuid,text) to authenticated;
grant execute on function public.widgets_selector_submit(text,text) to anon, authenticated;
