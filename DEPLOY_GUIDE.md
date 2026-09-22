# Guia de Producao e Deploy - Sistema Loja Lucrativa (SLL Hub)

Este documento descreve os passos e configuracoes necessarias para hospedar o SLL Hub Central em producao na Vercel, integrado ao Supabase Central (ID: flivmllysdhaydhogmhg).

---

## 1. Arquitetura Geral

- Front-end: React + Vite + Tailwind CSS (SPA)
- Hospedagem: Vercel
- Banco de Dados Central & Auth: Supabase (Projeto: flivmllysdhaydhogmhg)
- Separacao por Schemas Postgres:
  - public: Core SaaS (stores, products, plans, subscriptions, profiles)
  - vidlytics: Modulo de Videos e Reels e-commerce
  - live_commerce: Modulo de Transmissoes ao Vivo e Chat
- Injecao de Widgets nos Lojistas (GTM):
  - sll-loader.js: Script unico distribuido via CDN Vercel com CORS liberado (*). Injeta dinamicamente vidlytics-widget.js e/ou livecommerce-widget.js conforme a assinatura do cliente.

---

## 2. Configuracoes do Projeto na Vercel

Ao importar o repositorio sll-hub na Vercel:

1. Framework Preset: Vite
2. Root Directory: ./
3. Build Command: npm run build
4. Output Directory: dist
5. Install Command: npm install

### Variaveis de Ambiente na Vercel (Project Settings -> Environment Variables)

Configure as seguintes variaveis nos ambientes Production e Preview:

- VITE_SUPABASE_URL: https://flivmllysdhaydhogmhg.supabase.co
- VITE_SUPABASE_ANON_KEY: (Sua chave anon publica do projeto flivmllysdhaydhogmhg)

---

## 3. Regras de Roteamento SPA e CORS (vercel.json)

O arquivo vercel.json na raiz gerencia:
1. Rewrites SPA: Qualquer rota como /vidlytics, /live-commerce ou /auth e reescrita para /index.html, prevenindo erros 404 em requisicoes diretas ou refresh (F5).
2. CORS Habilitado: Cabecalhos Access-Control-Allow-Origin: * aplicados aos widgets estaticos (/sll-loader.js, /vidlytics-widget.js, /livecommerce-widget.js) para permitir inclusao sem bloqueios nos e-commerces dos clientes.

---

## 4. Comandos de Validacao Local Pre-Deploy

- npm run test       (Testes unitarios e integracao)
- npm run test:e2e   (Testes ponta a ponta com Playwright)
- npm run build      (Compilacao final de producao)

---

## 5. Integracao com Lojistas (GTM / E-commerce)

Para instalar o SLL na loja virtual do cliente, basta adicionar no head do site ou via GTM:

<script src="https://seu-dominio-sll.vercel.app/sll-loader.js" data-store-id="SEU_STORE_ID_AQUI" async></script>