begin;

create table if not exists public.commercial_dates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  tip         text,
  rule_type   text not null check (rule_type in ('fixed', 'nth_weekday')),
  month       smallint not null check (month between 1 and 12),
  day         smallint check (day between 1 and 31),
  weekday     smallint check (weekday between 0 and 6),
  nth         smallint check (nth between 1 and 5),
  lead_days   smallint not null default 7,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint commercial_dates_rule_chk check (
    (rule_type = 'fixed' and day is not null)
    or (rule_type = 'nth_weekday' and weekday is not null and nth is not null)
  )
);

create table if not exists public.commercial_date_sectors (
  commercial_date_id uuid not null references public.commercial_dates(id) on delete cascade,
  sector_id          uuid not null,
  primary key (commercial_date_id, sector_id)
);

create index if not exists idx_commercial_date_sectors_sector
  on public.commercial_date_sectors (sector_id);

alter table public.commercial_dates enable row level security;
alter table public.commercial_date_sectors enable row level security;

drop policy if exists "commercial_dates_read" on public.commercial_dates;
create policy "commercial_dates_read" on public.commercial_dates
  for select to authenticated using (is_active);

drop policy if exists "commercial_date_sectors_read" on public.commercial_date_sectors;
create policy "commercial_date_sectors_read" on public.commercial_date_sectors
  for select to authenticated using (true);

grant select on public.commercial_dates, public.commercial_date_sectors to authenticated;

insert into public.commercial_dates
  (slug, name, description, tip, rule_type, month, day, weekday, nth, lead_days, is_active, sort_order)
values
  ('dia-do-consumidor', 'Dia do Consumidor', 'Uma das maiores datas de promoção do ano.', 'Faça uma live com cupom exclusivo e frete grátis.', 'fixed', 3, 15, null, null, 7, true, 10),
  ('dia-das-maes', 'Dia das Mães', 'Segunda maior data do varejo.', 'Monte kits de presente e mostre ao vivo.', 'nth_weekday', 5, null, 0, 2, 14, true, 20),
  ('dia-dos-namorados', 'Dia dos Namorados', 'Forte para presentes.', 'Faça uma live de sugestões de presente por faixa de preço.', 'fixed', 6, 12, null, null, 10, true, 30),
  ('dia-dos-pais', 'Dia dos Pais', 'Boa data para ticket médio alto.', 'Destaque os produtos mais vendidos e ofereça embalagem para presente.', 'nth_weekday', 8, null, 0, 2, 10, true, 40),
  ('dia-das-criancas', 'Dia das Crianças', 'Pico de vendas no segundo semestre.', 'Programe a live uma semana antes e divulgue a lista de presentes.', 'fixed', 10, 12, null, null, 7, true, 50),
  ('black-friday', 'Black Friday', 'A maior data promocional do ano.', 'Faça uma live de pré-oferta e outra no dia, com cupons relâmpago.', 'nth_weekday', 11, null, 5, 4, 14, true, 60),
  ('natal', 'Natal', 'Pico de presentes e encomendas.', 'Mostre o prazo de entrega ao vivo para fechar vendas de última hora.', 'fixed', 12, 25, null, null, 14, true, 70),
  ('dia-da-mulher', 'Dia da Mulher', 'Forte em moda, beleza e semijoias.', 'Faça uma live com looks e combos.', 'fixed', 3, 8, null, null, 7, false, 15),
  ('dia-do-amigo', 'Dia do Amigo', 'Boa data para presentes de baixo valor.', 'Ofereça combos para presentear amigos.', 'fixed', 7, 20, null, null, 7, false, 35),
  ('dia-do-cliente', 'Dia do Cliente', 'Data para relacionamento e fidelização.', 'Faça uma live de agradecimento com cupom para quem já comprou.', 'fixed', 9, 15, null, null, 7, false, 45)
on conflict (slug) do nothing;

commit;