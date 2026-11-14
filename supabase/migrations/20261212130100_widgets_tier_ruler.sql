alter table widgets.widget_templates drop constraint if exists widget_templates_type_check;

drop table if exists widgets.widget_installations;

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

insert into widgets.widget_templates(type, name, description, default_config) values
('tier_ruler','Régua de descontos','Cards informativos de desconto progressivo, inseridos em qualquer ponto da página',
 '{"tiers":[
    {"label":"LEVE 2 PEÇAS","value":"20% OFF","note":"Renove o básico","highlight":false},
    {"label":"LEVE 3 PEÇAS ★","value":"30% OFF","note":"+ Brinde acima de R$ 300","highlight":true},
    {"label":"LEVE 4+ PEÇAS","value":"35% OFF","note":"+ Frete Grátis (R$ 459+)","highlight":false}],
   "footer":"⚡ + 5% de desconto extra no PIX · Desconto aplicado automaticamente no carrinho",
   "bg":"#0b0b0b","card":"#17150f","border":"#c9a84c","accent":"#c9a84c","text":"#ffffff","muted":"#9aa3b2",
   "placement":{"selector":"","position":"after"}}')
on conflict (type) do nothing;
