create schema if not exists widgets;

create or replace function public.is_superadmin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_superadmin')::boolean, false)
$$;

create or replace function widgets.owns_store(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_superadmin()
      or exists (select 1 from public.stores s where s.id = p_store and s.owner_id = auth.uid())
$$;

-- Catálogo de tipos de widget (gerido pelo SuperAdmin)
create table if not exists widgets.widget_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null unique check (type in ('popup','top_bar','floating_button','toast','countdown','exit_intent','custom_html')),
  name text not null,
  description text,
  default_config jsonb not null default '{}',
  min_plan text default 'basic',
  is_beta boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Widgets criados pelo lojista
create table if not exists widgets.widgets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  type text not null references widgets.widget_templates(type),
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  config jsonb not null default '{}',     -- título, texto, cores, CTA, link...
  trigger jsonb not null default '{"type":"delay","seconds":5}',
  targeting jsonb not null default '{"devices":["desktop","mobile"],"url_contains":[],"url_excludes":[],"frequency":{"mode":"session"}}',
  priority int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_widgets_store_status on widgets.widgets(store_id, status);

-- Eventos (impressão, clique, fechamento, conversão)
create table if not exists widgets.widget_events (
  id bigint generated always as identity primary key,
  store_id uuid not null,
  widget_id uuid not null references widgets.widgets(id) on delete cascade,
  event_type text not null check (event_type in ('impression','click','close','submit','conversion')),
  session_id text,
  url text,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists idx_widget_events_widget on widgets.widget_events(widget_id, created_at desc);
create index if not exists idx_widget_events_store on widgets.widget_events(store_id, created_at desc);

-- Status de instalação por loja
create table if not exists widgets.widget_installations (
  store_id uuid primary key references public.stores(id) on delete cascade,
  method text not null default 'gtm' check (method in ('gtm','empreender','script')),
  status text not null default 'pending' check (status in ('pending','active','error')),
  script_version text,
  last_seen_at timestamptz,
  last_seen_url text,
  last_error text,
  updated_at timestamptz not null default now()
);

-- RLS
alter table widgets.widget_templates enable row level security;
alter table widgets.widgets enable row level security;
alter table widgets.widget_events enable row level security;
alter table widgets.widget_installations enable row level security;

create policy tpl_read on widgets.widget_templates for select to authenticated using (is_active or public.is_superadmin());
create policy tpl_admin on widgets.widget_templates for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy wid_all on widgets.widgets for all to authenticated using (widgets.owns_store(store_id)) with check (widgets.owns_store(store_id));
create policy evt_read on widgets.widget_events for select to authenticated using (widgets.owns_store(store_id));
create policy inst_all on widgets.widget_installations for all to authenticated using (widgets.owns_store(store_id)) with check (widgets.owns_store(store_id));

grant usage on schema widgets to authenticated, service_role;
grant all on all tables in schema widgets to authenticated, service_role;

-- API pública para o script da loja (anon): config
create or replace function public.widgets_get_config(p_store uuid, p_version text default null, p_url text default null)
returns jsonb language plpgsql security definer set search_path = public, widgets as $$
declare result jsonb;
begin
  insert into widgets.widget_installations(store_id, script_version, last_seen_at, last_seen_url, status, updated_at)
  values (p_store, p_version, now(), p_url, 'active', now())
  on conflict (store_id) do update
    set script_version = excluded.script_version, last_seen_at = now(),
        last_seen_url = excluded.last_seen_url, status = 'active', updated_at = now();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id, 'type', w.type, 'config', w.config, 'trigger', w.trigger, 'targeting', w.targeting, 'priority', w.priority
  ) order by w.priority desc), '[]'::jsonb)
  into result
  from widgets.widgets w
  where w.store_id = p_store and w.status = 'active'
    and (w.starts_at is null or w.starts_at <= now())
    and (w.ends_at is null or w.ends_at >= now());
  return result;
end $$;

-- API pública: tracking
create or replace function public.widgets_track(p_widget uuid, p_event text, p_session text, p_url text, p_device text)
returns void language plpgsql security definer set search_path = public, widgets as $$
declare v_store uuid;
begin
  select store_id into v_store from widgets.widgets where id = p_widget;
  if v_store is null then return; end if;
  insert into widgets.widget_events(store_id, widget_id, event_type, session_id, url, device)
  values (v_store, p_widget, p_event, left(p_session,64), left(p_url,500), left(p_device,16));
end $$;

grant execute on function public.widgets_get_config(uuid,text,text) to anon, authenticated;
grant execute on function public.widgets_track(uuid,text,text,text,text) to anon, authenticated;

insert into widgets.widget_templates(type, name, description, default_config) values
 ('popup','Popup','Popup com título, texto e CTA','{"title":"Ganhe 10% OFF","text":"Use o cupom BEMVINDO","cta":"Aproveitar","url":"/","bg":"#ffffff","color":"#111111","btn_bg":"#111111","btn_color":"#ffffff"}'),
 ('top_bar','Barra de topo','Barra de aviso/promoção no topo','{"text":"Frete grátis acima de R$199","bg":"#111111","color":"#ffffff","url":""}'),
 ('floating_button','Botão flutuante (WhatsApp)','Botão fixo no canto da tela','{"label":"Fale conosco","url":"https://wa.me/55","bg":"#25D366","color":"#ffffff","position":"right"}'),
 ('toast','Prova social','Notificação discreta de compras/avisos','{"text":"Maria de Curitiba acabou de comprar","bg":"#ffffff","color":"#111111","position":"left"}'),
 ('countdown','Contagem regressiva','Barra com cronômetro de oferta','{"text":"A oferta termina em","ends_at":"","bg":"#c00","color":"#ffffff"}')
on conflict (type) do nothing;
