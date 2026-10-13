alter table public.tips add column if not exists scope text not null default 'hub';
alter table public.tips add column if not exists target_module text;
alter table public.tips add column if not exists cta_active_label text;
alter table public.tips add column if not exists cta_active_url text;
alter table public.tips add column if not exists cta_upgrade_label text;
alter table public.tips add column if not exists cta_upgrade_url text;
alter table public.tips drop constraint if exists tips_scope_check;
alter table public.tips add constraint tips_scope_check check (scope ~ '^[a-z0-9_]+$');
create index if not exists idx_tips_scope on public.tips (scope, status);

update public.tips set scope = 'vidlytics', target_module = 'vidlytics'
 where title in ('Seus vídeos têm views, mas poucos cliques', 'Suba seu primeiro vídeo interativo', 'Mostre as medidas da modelo');

update public.tips set target_module = 'vidlytics',
  cta_active_label = 'Abrir Vidlytics', cta_active_url = '/dashboard/modules/vidlytics',
  cta_upgrade_label = 'Conhecer o Vidlytics', cta_upgrade_url = '/dashboard/planos?modulo=vidlytics'
 where title = 'Leve o tráfego pago para páginas com vídeo';

insert into public.tips (title, content, category, niche, scope, target_module, cta_active_label, cta_active_url, cta_upgrade_label, cta_upgrade_url, estimated_minutes)
select 'Venda mais na Black Friday com lives',
       E'Uma live com produtos em destaque cria urgência e responde dúvidas em tempo real.\n\n- Escolha 5 a 8 produtos com boa margem\n- Defina um cupom exclusivo para quem assistir\n- Avise sua base com 3 dias de antecedência',
       'conversao', array['geral'], 'hub', 'live_commerce',
       'Criar transmissão no Live Commerce', '/dashboard/modules/live-commerce',
       'Conhecer o Live Commerce e liberar lives', '/dashboard/planos?modulo=live_commerce', 30
where not exists (select 1 from public.tips where title = 'Venda mais na Black Friday com lives');