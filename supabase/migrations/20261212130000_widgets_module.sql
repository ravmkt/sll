create schema if not exists widgets;

create or replace function widgets.owns_store(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_superadmin()
      or exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid())
$$;

create table if not exists widgets.widget_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null unique,
  name text not null,
  description text,
  default_config jsonb not null default '{}',
  min_plan text default 'basic',
  is_beta boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists widgets.widgets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  type text not null references widgets.widget_templates(type),
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  config jsonb not null default '{}',
  trigger jsonb not null default '{"type":"delay","seconds":0}',
  targeting jsonb not null default '{"devices":["desktop","mobile"],"url_contains":[],"url_excludes":[],"frequency":{"mode":"always"}}',
  priority int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_widgets_store_status on widgets.widgets(store_id, status);

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

create or replace function widgets.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_widgets_updated on widgets.widgets;
create trigger trg_widgets_updated before update on widgets.widgets for each row execute function widgets.set_updated_at();

alter table widgets.widget_templates enable row level security;
alter table widgets.widgets enable row level security;
alter table widgets.widget_events enable row level security;

drop policy if exists tpl_read on widgets.widget_templates;
drop policy if exists tpl_admin on widgets.widget_templates;
drop policy if exists wid_all on widgets.widgets;
drop policy if exists evt_read on widgets.widget_events;
create policy tpl_read on widgets.widget_templates for select to authenticated using (is_active or public.is_superadmin());
create policy tpl_admin on widgets.widget_templates for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy wid_all on widgets.widgets for all to authenticated using (widgets.owns_store(store_id)) with check (widgets.owns_store(store_id));
create policy evt_read on widgets.widget_events for select to authenticated using (widgets.owns_store(store_id));

grant usage on schema widgets to authenticated, service_role;
grant all on all tables in schema widgets to authenticated, service_role;
grant usage, select on all sequences in schema widgets to authenticated, service_role;

create or replace function public.widgets_get_config(p_store uuid, p_version text default null, p_url text default null)
returns jsonb language sql stable security definer set search_path = public, widgets as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id, 'type', w.type, 'config', w.config, 'trigger', w.trigger,
    'targeting', w.targeting, 'priority', w.priority
  ) order by w.priority desc), '[]'::jsonb)
  from widgets.widgets w
  where w.store_id = p_store and w.status = 'active'
    and (w.starts_at is null or w.starts_at <= now())
    and (w.ends_at is null or w.ends_at >= now());
$$;

create or replace function public.widgets_track(p_widget uuid, p_event text, p_session text, p_url text, p_device text)
returns void language plpgsql security definer set search_path = public, widgets as $$
declare v_store uuid;
begin
  if p_event not in ('impression','click','close','submit','conversion') then return; end if;
  select store_id into v_store from widgets.widgets where id = p_widget and status = 'active';
  if v_store is null then return; end if;
  insert into widgets.widget_events(store_id, widget_id, event_type, session_id, url, device)
  values (v_store, p_widget, p_event, left(p_session,64), left(p_url,500), left(p_device,16));
end $$;

grant execute on function public.widgets_get_config(uuid,text,text) to anon, authenticated;
grant execute on function public.widgets_track(uuid,text,text,text,text) to anon, authenticated;

insert into widgets.widget_templates(type, name, description, default_config) values
('tier_ruler','Régua de descontos','Cards informativos de desconto progressivo, inseridos em qualquer ponto da página',
 '{"tiers":[
    {"label":"LEVE 2 PEÇAS","value":"20% OFF","note":"Renove o básico","highlight":false},
    {"label":"LEVE 3 PEÇAS ★","value":"30% OFF","note":"+ Brinde acima de R$ 300","highlight":true},
    {"label":"LEVE 4+ PEÇAS","value":"35% OFF","note":"+ Frete Grátis (R$ 459+)","highlight":false}],
   "footer":"⚡ + 5% de desconto extra no PIX · Desconto aplicado automaticamente no carrinho",
   "bg":"#0b0b0b","card":"#17150f","border":"#c9a84c","accent":"#c9a84c","text":"#ffffff","muted":"#9aa3b2",
   "placement":{"selector":"","position":"after"}}'),
('popup','Popup','Popup com título, texto e CTA','{"title":"Ganhe 10% OFF","text":"Use o cupom BEMVINDO","cta":"Aproveitar","url":"/","bg":"#ffffff","color":"#111111","btn_bg":"#111111","btn_color":"#ffffff"}'),
('top_bar','Barra de topo','Barra de aviso/promoção no topo','{"text":"Frete grátis acima de R$199","bg":"#111111","color":"#ffffff","url":""}'),
('floating_button','Botão flutuante','Botão fixo no canto da tela','{"label":"Fale conosco","url":"https://wa.me/55","bg":"#25D366","color":"#ffffff","position":"right"}'),
('toast','Prova social','Notificação discreta','{"text":"Maria de Curitiba acabou de comprar","bg":"#ffffff","color":"#111111","position":"left"}'),
('countdown','Contagem regressiva','Barra com cronômetro de oferta','{"text":"A oferta termina em","ends_at":"","bg":"#c00","color":"#ffffff"}')
on conflict (type) do nothing;

insert into public.hub_modules (slug, name, status, is_public_for_sale, sort_order, description, benefits, features, route_path)
values ('widgets','Widgets','coming_soon', false, 50,
  'Elementos de conversão e gatilhos inseridos na sua loja',
  '["Régua de descontos","Popups e barras","Gatilhos de conversão"]'::jsonb,
  '["Régua de descontos","Popups e barras","Gatilhos de conversão"]'::jsonb,
  '/dashboard/modules/widgets')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
