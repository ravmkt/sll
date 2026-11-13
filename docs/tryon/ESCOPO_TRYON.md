# SLL Hub — Módulo Try-On: Escopo e Plano de Execução
Atualizado em: 13/11/2026 | Responsável: Rodrigo (SuperAdmin)

## 1. Objetivo
Permitir que o visitante envie uma foto sua e veja os produtos da loja vestidos nele.
Referência de mercado: metaKosmos mK Fashion+ (foto -> provador -> carrinho).
Posicionamento do SLL: lojistas pequenos e médios, instalação simples via GTM ou integração direta.

## 2. Modos de uso (mesmo módulo, mesmo motor)
| Modo | Descrição | Flag |
|---|---|---|
| Provador por produto | O visitante prova uma peça específica na página de produto | `product_mode_enabled` |
| Vitrine Personalizada | A foto vale para o site inteiro (Index, Catálogo, Produto) | `storefront_mode_enabled` (beta) |

## 3. Regras de ouro
- Toda tabela do Try-On fica no schema `tryon`.
- Dados usados por mais de um módulo ficam em `public`: `stores`, credenciais de integração e planos.
- GTM primeiro. Solução nativa da plataforma só quando o GTM não resolver.
- Prefixo `sll-tryon-*` em IDs e classes. Nada do legado `tryon-*` / `useanny`.
- A IA é controlada pelo Admin Master, com a mesma estrutura dos outros módulos que usam IA.

## 4. Instalação (dois caminhos, um único widget)
| Caminho | Quando | Como |
|---|---|---|
| Integração direta Yampi | Lojista na Yampi | Configuração com alias, chave secreta e token da loja (mesmo padrão já usado na loja Use Anny). Catálogo via API/webhooks. |
| GTM | Qualquer outra plataforma | Tag HTML Personalizado com `sll-loader.js` + `tryon-widget.js`. Catálogo lido da página (JSON-LD, og:, DOM). |

Os dois caminhos usam o mesmo `tryon-widget.js` e o mesmo backend. Só muda como o produto e a imagem são descobertos.

## 5. Fluxo do visitante
1. Clica em "Experimente em você" ou "Ver tudo em mim".
2. Aceita o termo LGPD e envia ou tira a foto.
3. A foto é validada e salva em bucket privado.
4. O widget troca as imagens visíveis (lazy, IntersectionObserver). A original aparece primeiro e a vestida entra quando fica pronta.
5. Adiciona ao carrinho a partir da imagem vestida.
6. Pode alternar para a imagem original e apagar a foto a qualquer momento.

## 6. Arquitetura
- Widgets: `public/tryon-widget.js` (v1 criado, v2 a fazer) e `public/sll-loader.js`.
- Backend: Edge Functions do Supabase (`tryon-session`, `tryon-photo`, `tryon-generate`, `tryon-yampi-sync`).
- IA: Gemini (modelo de imagem), com modelo, chave e custo configuráveis no Admin Master.
- Cache por `foto + produto + imagem`. Fila com limite de concorrência. Geração sob demanda.
- Limites por loja: créditos mensais e gerações por visitante (`tryon.store_limits`).

## 7. Dados (schema `tryon`)
settings, store_limits, products, user_photos, results, usage, events.
Buckets privados: `tryon-photos` e `tryon-results`.
RLS: o lojista vê só a própria loja e nunca vê a foto do visitante. O SuperAdmin vê tudo. O visitante anônimo só acessa pelas Edge Functions (service_role).
Migration: `supabase/migrations/20261113_tryon_schema.sql`.

## 8. LGPD
Consentimento explícito e versionado. Retenção configurável (padrão 30 dias). Exclusão a pedido. Bucket privado com URL assinada. Opção "não salvar minha foto".

## 9. Integrações com outros módulos
CRM (lead e consentimento), Recupera/Email Mkt (carrinho com a imagem vestida), Vidlytics (look em vídeo), Gamificação (incentivo pela foto), Social Media (compartilhar), Agentes (tamanho e looks), Insights (uso, conversão, devoluções), Admin Master (flags, limites e custo por loja), Campo Personalizado (altura e peso).

## 10. Plano de execução
- [x] F0 — Remoção do Try-On legado do tema Yampi (Use Anny)
- [x] F0 — `tryon-widget.js` v1 (botão popup, imagem, regra de acessórios)
- [x] F1 — Migration do schema `tryon` escrita
- [ ] F1 — Migration aplicada no Supabase e schema `tryon` exposto na API
- [ ] F2 — Admin Master: config de IA (Gemini) reaproveitando a estrutura existente, flags e limites por loja
- [ ] F3 — Edge Functions: sessão, upload da foto, geração (Gemini), purga LGPD
- [ ] F4 — Integração Yampi direta (alias + chave secreta + token): sincronização do catálogo
- [ ] F5 — `tryon-widget.js` v2: captura da foto, troca de imagens, skeleton e alternância original/vestida
- [ ] F6 — Painel do lojista (configurações, páginas ativas, categorias, consumo)
- [ ] F7 — Insights e benchmarks (alimentar `admin_benchmarks`)
- [ ] F8 — Integrações com CRM, Recupera, Vidlytics e outros

## 11. Decisões tomadas
- IA: Gemini (por enquanto).
- Vitrine Personalizada dentro do Try-On, com flag beta.
- Integração direta hoje só com a Yampi, por credenciais da loja. Ainda não há app de parceiro.

## 12. Pendências
- Confirmar as colunas de `public.stores` (vínculo usuário -> loja).
- Mapear onde ficam a config de IA e as credenciais de integração (para reaproveitar).
- Definir o escopo da V1: só a página de produto ou também listagens.
- Definir as categorias aceitas (roupas; acessórios ocultos como no legado).
