update public.hub_modules set
  name = E'Promo\u00e7\u00f5es',
  status = 'active',
  is_public_for_sale = false,
  description = E'Campanhas promocionais, pre\u00e7os por campanha e artes prontas em massa para WhatsApp e redes sociais.',
  benefits = '["Artes prontas em massa","Pre\u00e7os promocionais por campanha","Mensagem com campos din\u00e2micos"]'::jsonb,
  features = '["Artes prontas em massa","Pre\u00e7os promocionais por campanha","Mensagem com campos din\u00e2micos"]'::jsonb,
  route_path = '/dashboard/modules/promocoes/studio-artes',
  updated_at = now()
where slug = 'promocoes';

insert into public.hub_modules (slug, name, status, is_public_for_sale, sort_order, description, benefits, features, route_path)
select 'promocoes', E'Promo\u00e7\u00f5es', 'active', false, 7,
  E'Campanhas promocionais, pre\u00e7os por campanha e artes prontas em massa para WhatsApp e redes sociais.',
  '["Artes prontas em massa","Pre\u00e7os promocionais por campanha","Mensagem com campos din\u00e2micos"]'::jsonb,
  '["Artes prontas em massa","Pre\u00e7os promocionais por campanha","Mensagem com campos din\u00e2micos"]'::jsonb,
  '/dashboard/modules/promocoes/studio-artes'
where not exists (select 1 from public.hub_modules where slug = 'promocoes');

insert into public.store_module_apps (store_id, module_key, enabled, updated_at)
select s.id, 'promocoes', true, now()
from public.stores s
where s.id in ('955ce943-52b4-4876-802c-e4afe5e9c4c8','47ad9ac3-71e7-4f6b-8d26-2a0d6a6552b6')
on conflict (store_id, module_key) do update set enabled = true, updated_at = now();

select slug, name, status, route_path from public.hub_modules order by sort_order;
