-- Sessões de seleção de elemento (módulo Widgets)
create table if not exists widgets.selector_sessions (
  token        text primary key,
  store_id     uuid not null references public.stores(id) on delete cascade,
  selector     text,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  submitted_at timestamptz
);
alter table widgets.selector_sessions enable row level security;
-- sem policies: acesso somente pelas RPCs security definer abaixo

create or replace function public.widgets_selector_create(p_store_id uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 80 then raise exception 'invalid_token'; end if;
  delete from widgets.selector_sessions where created_at < now() - interval '1 day';
  insert into widgets.selector_sessions(token, store_id, created_by) values (p_token, p_store_id, auth.uid());
end $$;

create or replace function public.widgets_selector_submit(p_token text, p_selector text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_selector is null or length(p_selector) = 0 or length(p_selector) > 600 then raise exception 'invalid_selector'; end if;
  update widgets.selector_sessions
     set selector = p_selector, submitted_at = now()
   where token = p_token and selector is null and created_at > now() - interval '30 minutes';
  if not found then raise exception 'invalid_or_expired_token'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.widgets_selector_poll(p_token text)
returns text language sql security definer set search_path = public stable as $$
  select selector from widgets.selector_sessions where token = p_token and created_by = auth.uid();
$$;

revoke all on function public.widgets_selector_create(uuid, text) from public;
revoke all on function public.widgets_selector_submit(text, text) from public;
revoke all on function public.widgets_selector_poll(text) from public;
grant execute on function public.widgets_selector_create(uuid, text) to authenticated;
grant execute on function public.widgets_selector_poll(text) to authenticated;
grant execute on function public.widgets_selector_submit(text, text) to anon, authenticated;
