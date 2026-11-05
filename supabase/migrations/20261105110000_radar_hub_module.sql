insert into public.hub_modules
  (slug, name, status, is_public_for_sale, sort_order, description, benefits, features, route_path)
values (
  'radar', 'Radar', 'coming_soon', false, 3,
  'Sua loja sendo encontrada no Google, no Maps e nas IAs',
  '["Diagnóstico de SEO da loja","Ranking de palavras-chave","Otimização de produtos com IA"]'::jsonb,
  '["Diagnóstico de SEO da loja","Ranking de palavras-chave","Otimização de produtos com IA"]'::jsonb,
  '/dashboard/modules/radar'
)
on conflict (slug) do nothing;