begin;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commercial_date_sectors_sector_fk') then
    alter table public.commercial_date_sectors
      add constraint commercial_date_sectors_sector_fk
      foreign key (sector_id) references public.sectors(id) on delete cascade;
  end if;
end $$;

update public.commercial_dates set is_active = true
where slug in ('dia-da-mulher', 'dia-do-amigo', 'dia-do-cliente');

insert into public.commercial_dates
  (slug, name, description, tip, rule_type, month, day, lead_days, is_active, sort_order)
values
  ('dia-mundial-dos-animais', 'Dia Mundial dos Animais', 'Data de engajamento forte para pet shops.', 'Faça uma live com dicas de cuidados e combos de ração e acessórios.', 'fixed', 10, 4, 7, true, 55),
  ('dia-do-artesao', 'Dia do Artesão', 'Valoriza o trabalho manual e o produto autoral.', 'Mostre o processo de criação ao vivo e venda peças exclusivas.', 'fixed', 3, 19, 7, true, 16),
  ('dia-mundial-da-saude', 'Dia Mundial da Saúde', 'Momento de atenção a bem-estar e suplementação.', 'Faça uma live com especialista e kits de suplementos.', 'fixed', 4, 7, 7, true, 17),
  ('volta-as-aulas', 'Volta às Aulas', 'Período de compras de material, tecnologia e presentes.', 'Monte kits de volta às aulas e mostre ao vivo.', 'fixed', 2, 1, 14, true, 5)
on conflict (slug) do nothing;

with m(date_slug, sector_slug) as (values
  ('dia-dos-namorados','moda_acessorios'), ('dia-dos-namorados','beleza_cosmeticos'),
  ('dia-dos-namorados','joias_semijoias'), ('dia-dos-namorados','alimentos_bebidas'),
  ('dia-dos-namorados','artesanato'), ('dia-dos-namorados','eletronicos'),
  ('dia-dos-namorados','casa_decoracao'),
  ('dia-dos-pais','moda_acessorios'), ('dia-dos-pais','eletronicos'),
  ('dia-dos-pais','esporte_lazer'), ('dia-dos-pais','beleza_cosmeticos'),
  ('dia-dos-pais','alimentos_bebidas'), ('dia-dos-pais','casa_decoracao'),
  ('dia-dos-pais','saude_suplementos'),
  ('dia-das-criancas','infantil_brinquedos'), ('dia-das-criancas','moda_acessorios'),
  ('dia-das-criancas','esporte_lazer'), ('dia-das-criancas','eletronicos'),
  ('dia-das-criancas','artesanato'), ('dia-das-criancas','alimentos_bebidas'),
  ('dia-da-mulher','moda_acessorios'), ('dia-da-mulher','beleza_cosmeticos'),
  ('dia-da-mulher','joias_semijoias'), ('dia-da-mulher','saude_suplementos'),
  ('dia-da-mulher','casa_decoracao'), ('dia-da-mulher','artesanato'),
  ('dia-do-amigo','moda_acessorios'), ('dia-do-amigo','joias_semijoias'),
  ('dia-do-amigo','beleza_cosmeticos'), ('dia-do-amigo','alimentos_bebidas'),
  ('dia-do-amigo','artesanato'), ('dia-do-amigo','eletronicos'),
  ('dia-mundial-dos-animais','pet_shop'),
  ('dia-do-artesao','artesanato'),
  ('dia-mundial-da-saude','saude_suplementos'),
  ('volta-as-aulas','infantil_brinquedos'), ('volta-as-aulas','eletronicos'),
  ('volta-as-aulas','artesanato')
)
insert into public.commercial_date_sectors (commercial_date_id, sector_id)
select d.id, s.id
from m
join public.commercial_dates d on d.slug = m.date_slug
join public.sectors s on s.slug = m.sector_slug
on conflict do nothing;

commit;