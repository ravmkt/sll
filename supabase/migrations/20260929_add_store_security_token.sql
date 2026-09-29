-- Garante coluna de token de segurança por loja (usado no script de rastreamento)
alter table public.stores
  add column if not exists security_token uuid not null default gen_random_uuid();

comment on column public.stores.security_token is 'Token usado para autenticar requisicoes do script de rastreamento (vidlytics-tracking.js) no frontend da loja do lojista';
