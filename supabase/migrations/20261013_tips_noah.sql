create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'conversao'
    check (category in ('conversao','trafego','precificacao','operacao','clube_sll')),
  niche text[] not null default array['geral'],
  metric_trigger jsonb
    check (metric_trigger is null or (metric_trigger ? 'metric' and metric_trigger ? 'operator' and metric_trigger ? 'value')),
  action_label text,
  action_url text,
  estimated_minutes int check (estimated_minutes is null or estimated_minutes between 1 and 240),
  is_featured boolean not null default false,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tips_status on public.tips (status, is_featured desc, created_at desc);

alter table public.tips enable row level security;
drop policy if exists "lojista le dicas ativas" on public.tips;
create policy "lojista le dicas ativas" on public.tips
  for select to authenticated using (status or public.is_superadmin());
drop policy if exists "master gerencia dicas" on public.tips;
create policy "master gerencia dicas" on public.tips
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

create table if not exists public.tip_feedback (
  tip_id uuid not null references public.tips(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  implemented boolean not null default false,
  vote smallint check (vote in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (tip_id, store_id)
);
alter table public.tip_feedback enable row level security;
drop policy if exists "lojista gerencia feedback das dicas" on public.tip_feedback;
create policy "lojista gerencia feedback das dicas" on public.tip_feedback
  for all to authenticated
  using (public.is_store_owner_or_member(store_id) or public.is_superadmin())
  with check (public.is_store_owner_or_member(store_id) or public.is_superadmin());

insert into public.tips (title, content, category, niche, metric_trigger, action_label, action_url, estimated_minutes, is_featured)
select * from (values
  ('Seus vídeos têm views, mas poucos cliques',
   E'O público assiste, mas não clica no produto. Isso quase sempre é problema de **chamada para ação**.\n\n- Leve o botão de compra para aparecer nos primeiros segundos\n- Use um texto direto, como "Comprar agora"\n- Vincule o produto certo a cada vídeo',
   'conversao', array['geral'], '{"metric":"ctr","operator":"<","value":2}'::jsonb, 'Ajustar vídeos', '/dashboard/modules/vidlytics', 5, true),
  ('Suba seu primeiro vídeo interativo',
   E'Loja sem vídeo não gera venda assistida.\n\n- Grave 15 a 30 segundos com o celular\n- Mostre caimento, textura ou detalhe da peça mais vendida\n- Vincule o produto e publique',
   'conversao', array['geral'], '{"metric":"videos","operator":"==","value":0}'::jsonb, 'Abrir Vidlytics', '/dashboard/modules/vidlytics', 10, true),
  ('Sincronize seus produtos',
   E'Sem produtos cadastrados você não consegue vincular vídeos nem liberar a compra direta.\n\nImporte pelo XML, planilha ou cadastre manualmente.',
   'operacao', array['geral'], '{"metric":"products","operator":"==","value":0}'::jsonb, 'Ir para Produtos', '/dashboard/produtos', 5, false),
  ('Indique lojistas e receba todo mês',
   E'Cada loja indicada que assina te paga **10% de comissão recorrente**.\n\n- Copie seu link no Clube SLL\n- Envie para colegas que também vendem online',
   'clube_sll', array['geral'], '{"metric":"referred","operator":"==","value":0}'::jsonb, 'Ver Clube SLL', '/dashboard/afiliados', 2, false),
  ('Mostre as medidas da modelo',
   E'Dúvida de tamanho é o principal motivo de troca em moda.\n\n- Informe altura e peso da modelo\n- Diga qual tamanho ela veste\n- Use a página de Medidas para exibir isso no vídeo',
   'conversao', array['Moda & Acessórios'], null, 'Configurar medidas', '/dashboard/medidas', 5, false),
  ('Calcule a margem antes de entrar em promoção',
   E'Desconto sem conta pode gerar venda e prejuízo ao mesmo tempo.\n\n- Some custo do produto, frete, taxa do gateway e impostos\n- Defina a margem mínima aceitável\n- Só então escolha o percentual da oferta',
   'precificacao', array['geral'], null, null, null, 10, false),
  ('Leve o tráfego pago para páginas com vídeo',
   E'Anúncio que cai em página com vídeo costuma reter mais.\n\n- Escolha a página de produto com vídeo vinculado\n- Teste um anúncio por produto campeão\n- Compare o CTR dos vídeos antes e depois',
   'trafego', array['geral'], null, null, null, 15, false)
) as v(title, content, category, niche, metric_trigger, action_label, action_url, estimated_minutes, is_featured)
where not exists (select 1 from public.tips);

select count(*) as dicas from public.tips;