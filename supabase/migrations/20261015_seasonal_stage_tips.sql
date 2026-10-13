create extension if not exists unaccent;

-- ===== 1) Setor unificado =====
create or replace function public._norm_sector(t text) returns text language sql stable as $$
  select lower(trim(regexp_replace(replace(unaccent(coalesce(t, '')), '&', 'e'), '\s*/\s*', ' ', 'g')))
$$;

alter table public.tips add column if not exists sector_ids uuid[] not null default '{}';

update public.tips t
set sector_ids = coalesce((
  select array_agg(distinct s.id)
  from public.sectors s, unnest(t.niche) n
  where public._norm_sector(n) <> ''
    and (public._norm_sector(s.name) = public._norm_sector(n)
         or public._norm_sector(s.name) like public._norm_sector(n) || ' %')
), '{}')
where coalesce(array_length(t.niche, 1), 0) > 0
  and not exists (select 1 from unnest(t.niche) g where lower(g) = 'geral')
  and cardinality(t.sector_ids) = 0;

update public.stores st
set sector_id = s.id
from public.sectors s
where st.sector_id is null
  and st.store_niche is not null
  and public._norm_sector(st.store_niche) <> ''
  and (public._norm_sector(s.name) = public._norm_sector(st.store_niche)
       or public._norm_sector(s.name) like public._norm_sector(st.store_niche) || ' %');

-- ===== 2) Dicas sazonais por etapa =====
create table if not exists public.commercial_date_stage_tips (
  id uuid primary key default gen_random_uuid(),
  commercial_date_id uuid not null references public.commercial_dates(id) on delete cascade,
  sector_id uuid references public.sectors(id) on delete cascade,
  scope text not null default 'hub' check (scope ~ '^[a-z0-9_]+$'),
  stage text not null check (stage in ('plan', 'produce', 'urgent')),
  title text not null,
  content text not null,
  target_module text,
  cta_active_label text,
  cta_active_url text,
  cta_upgrade_label text,
  cta_upgrade_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_stage_tips_lookup on public.commercial_date_stage_tips (commercial_date_id, scope, stage);

alter table public.commercial_date_stage_tips enable row level security;
drop policy if exists "stage_tips_read" on public.commercial_date_stage_tips;
create policy "stage_tips_read" on public.commercial_date_stage_tips for select to authenticated using (is_active);

-- ===== 3) Seed: Black Friday =====
insert into public.commercial_date_stage_tips
  (commercial_date_id, scope, stage, title, content, target_module, cta_active_label, cta_active_url, cta_upgrade_label, cta_upgrade_url)
select cd.id, v.scope, v.stage, v.title, v.content, v.tm, v.al, v.au, v.ul, v.uu
from public.commercial_dates cd
cross join (values
  ('hub', 'plan', 'Black Friday: planeje estoque e estratégia',
   'Defina os produtos da campanha, confira o estoque e trace a meta de faturamento. Quem planeja cedo negocia melhor com fornecedores.',
   null, null, null, null, null),
  ('hub', 'produce', 'Black Friday: liquide estoque parado com uma Live Shop',
   'Faça uma Live Shop na Black Friday para liquidar estoque parado e captar leads antes da data.',
   'live_commerce', 'Agendar Live', '/dashboard/modules/live-commerce', 'Assinar Live Commerce', '/dashboard/planos?modulo=live_commerce'),
  ('hub', 'urgent', 'Black Friday: teste tudo e aqueça sua base',
   'Revise preços, frete e checkout, e avise sua base com ofertas antecipadas. Vídeos nas páginas das ofertas ajudam a converter o tráfego.',
   'vidlytics', 'Abrir Vidlytics', '/dashboard/modules/vidlytics', 'Conhecer o Vidlytics', '/dashboard/planos?modulo=vidlytics'),
  ('vidlytics', 'plan', 'Black Friday: escolha os produtos que terão vídeo',
   'Liste os 5 produtos mais vendidos e os que você quer destacar na campanha. Defina o roteiro de cada vídeo agora.',
   null, null, null, null, null),
  ('vidlytics', 'produce', 'Black Friday: grave os vídeos com antecedência',
   'Grave os vídeos dos seus 5 produtos mais vendidos, vincule cada um ao produto e deixe tudo publicado antes da data.',
   null, null, null, null, null),
  ('vidlytics', 'urgent', 'Black Friday: teste e publique os vídeos',
   'Teste o botão de compra em cada vídeo, publique o carrossel nas páginas das ofertas e acompanhe views e cliques todos os dias.',
   null, null, null, null, null),
  ('live_commerce', 'plan', 'Black Friday: planeje sua Live Shop',
   'Escolha data, horário e os produtos da live. Defina o cupom exclusivo e o roteiro da transmissão.',
   null, null, null, null, null),
  ('live_commerce', 'produce', 'Black Friday: agende a Live Shop e capte leads',
   'Agende sua Live Shop, divulgue para a sua base e capte leads com um lembrete antes da transmissão.',
   null, null, null, null, null),
  ('live_commerce', 'urgent', 'Black Friday: teste a transmissão e avise a base',
   'Faça um teste de som e imagem, confira os produtos vinculados e envie o lembrete final para quem se cadastrou.',
   null, null, null, null, null)
) as v(scope, stage, title, content, tm, al, au, ul, uu)
where cd.name = 'Black Friday'
  and not exists (
    select 1 from public.commercial_date_stage_tips x
    where x.commercial_date_id = cd.id and x.scope = v.scope and x.stage = v.stage
  );

-- ===== Conferencias =====
select 'lojas sem setor' as item, count(*)::text as valor from public.stores where sector_id is null
union all
select 'dicas com niche mas sem sector_ids', count(*)::text from public.tips
 where coalesce(array_length(niche, 1), 0) > 0 and cardinality(sector_ids) = 0
   and not exists (select 1 from unnest(niche) g where lower(g) = 'geral')
union all
select 'dicas sazonais Black Friday', count(*)::text from public.commercial_date_stage_tips;