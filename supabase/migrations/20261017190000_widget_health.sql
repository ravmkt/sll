create table if not exists public.widget_health (
  store_id uuid primary key references public.stores(id) on delete cascade,
  first_ping_at timestamptz not null default now(),
  last_ping_at timestamptz not null default now(),
  ping_count bigint not null default 1,
  loader_version text,
  modules text[] not null default '{}',
  last_page_url text,
  last_error text,
  last_error_at timestamptz,
  error_count bigint not null default 0
);

alter table public.widget_health enable row level security;
drop policy if exists "superadmin read widget_health" on public.widget_health;
create policy "superadmin read widget_health" on public.widget_health
  for select using (public.is_superadmin());

create or replace function public.sll_widget_ping(
  p_store_id uuid, p_version text, p_modules text[], p_page text, p_error text
) returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_err text := nullif(left(coalesce(p_error, ''), 300), '');
  v_mods text[];
begin
  if p_store_id is null or not exists (select 1 from public.stores where id = p_store_id) then return; end if;
  select coalesce(array_agg(left(m, 40)), '{}') into v_mods from unnest(p_modules[1:10]) m;

  insert into public.widget_health as w
    (store_id, loader_version, modules, last_page_url, last_error, last_error_at, error_count)
  values
    (p_store_id, left(p_version, 20), v_mods, left(p_page, 300), v_err,
     case when v_err is not null then now() end, case when v_err is not null then 1 else 0 end)
  on conflict (store_id) do update set
    last_ping_at = now(),
    ping_count = w.ping_count + 1,
    loader_version = excluded.loader_version,
    modules = excluded.modules,
    last_page_url = excluded.last_page_url,
    last_error = coalesce(excluded.last_error, w.last_error),
    last_error_at = coalesce(excluded.last_error_at, w.last_error_at),
    error_count = w.error_count + excluded.error_count;

  if v_err is null then
    update public.stores set script_verified = true where id = p_store_id and script_verified is distinct from true;
  end if;
end $$;

create or replace function public.admin_widget_health(p_store_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  w public.widget_health%rowtype;
  v_event timestamptz;
  v_status text;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  select * into w from public.widget_health where store_id = p_store_id;
  select max(created_at) into v_event from public.store_activity_events where store_id = p_store_id;

  v_status := case
    when w.store_id is null and v_event is null then 'never'
    when w.store_id is null then 'legacy'
    when w.last_ping_at < now() - interval '7 days' then 'stale'
    when w.last_error_at is not null and w.last_error_at >= w.last_ping_at then 'error'
    else 'ok' end;

  return jsonb_build_object(
    'status', v_status,
    'first_ping_at', w.first_ping_at,
    'last_ping_at', w.last_ping_at,
    'ping_count', coalesce(w.ping_count, 0),
    'loader_version', w.loader_version,
    'modules', to_jsonb(coalesce(w.modules, '{}'::text[])),
    'last_page_url', w.last_page_url,
    'last_error', w.last_error,
    'last_error_at', w.last_error_at,
    'error_count', coalesce(w.error_count, 0),
    'last_event_at', v_event
  );
end $$;

revoke all on function public.sll_widget_ping(uuid, text, text[], text, text) from public;
revoke all on function public.admin_widget_health(uuid) from public, anon;
grant execute on function public.sll_widget_ping(uuid, text, text[], text, text) to anon, authenticated;
grant execute on function public.admin_widget_health(uuid) to authenticated;