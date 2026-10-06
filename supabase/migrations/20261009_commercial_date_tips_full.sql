drop table if exists public.tmp_map, public.tmp_d, public.tmp_novas;

do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'public.commercial_dates'::regclass and contype = 'c' loop
    execute format('alter table public.commercial_dates drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.commercial_dates add constraint commercial_dates_rule_type_check
  check (rule_type in ('fixed','nth_weekday','easter_offset'));

insert into public.commercial_dates (id, slug, name, description, tip, rule_type, month, day, lead_days, is_active, sort_order)
select gen_random_uuid(), v.slug, v.name, v.tip, v.tip, 'easter_offset', 3, v.day, v.lead, true,
  (select coalesce(max(sort_order),0) from public.commercial_dates) + v.ord
from (values
  ('carnaval','Carnaval','Fantasias, beleza, moda praia e bebidas: divulgue 3 semanas antes.',-47,21,1),
  ('pascoa','Páscoa','Chocolates, cestas e presentes: mostre ideias de presentes em vídeo.',0,30,2)
) as v(slug,name,tip,day,lead,ord)
where not exists (select 1 from public.commercial_dates c where c.slug = v.slug);

insert into public.commercial_date_sectors (commercial_date_id, sector_id)
select c.id, s.id from public.commercial_dates c cross join public.sectors s
where c.slug in ('carnaval','pascoa')
  and not exists (select 1 from public.commercial_date_sectors l where l.commercial_date_id = c.id and l.sector_id = s.id);
do $do$
begin
create table if not exists public.commercial_date_tips (
  id uuid primary key default gen_random_uuid(),
  commercial_date_id uuid not null references public.commercial_dates(id) on delete cascade,
  sector_id uuid not null references public.sectors(id) on delete cascade,
  period_label text,
  tip text not null,
  created_at timestamptz not null default now(),
  unique (commercial_date_id, sector_id)
);
alter table public.commercial_date_tips enable row level security;
drop policy if exists "commercial_date_tips_select" on public.commercial_date_tips;
create policy "commercial_date_tips_select" on public.commercial_date_tips for select to authenticated using (true);

drop table if exists _map;
drop table if exists _d;
create temp table _map (k text, rx text);
insert into _map values
('alim','alimen|bebid'),('arte','artesan'),('bele','beleza|cosm'),('casa','casa|decor'),
('elet','eletr|gadget'),('espo','esport|lazer'),('infa','infant|brinq'),('joia','joia|jóia|semij'),
('moda','moda'),('outr','outro|servi'),('pet','pet'),('saud','sa[uú]de|suplem');

create temp table _d (k text, slug text, name text, m smallint, d smallint, periodo text, tip text);
insert into _d values
-- ALIMENTOS E BEBIDAS
('alim','carnaval',null,null,null,'Fevereiro / Março','Monte kits de "Esquenta" e "Ressaca" com combos de bebidas, isotônicos, petiscos e snacks com desconto progressivo.'),
('alim','st-patricks-day','St. Patrick''s Day',3,17,'17/03','Crie promoções para cervejas artesanais, chopp verde, porções e combos temáticos para consumo no local ou delivery.'),
('alim','pascoa',null,null,null,'Março / Abril','Oferte cestas prontas, combos de harmonização de peixes/vinhos e pré-venda com desconto para ovos artesanais.'),
('alim','dia-do-cafe','Dia do Café',10,1,'17/04 e 01/10','Faça degustações orientadas, venda assinaturas de grãos e crie kits "Café + Acessório/Xícara" com preço especial.'),
('alim','dia-do-hamburguer','Dia do Hambúrguer',5,28,'28/05','Lance um hambúrguer de edição limitada para a data e ofereça "Double Burger" ou refrigerante/batata grátis em combos.'),
('alim','dia-dos-namorados',null,null,null,'12/06','Venda jantares de menu degustação sob reserva, cestas de café da manhã românticas e vinhos/queijos harmonizados.'),
('alim','festa-junina','Festa Junina',6,24,'Junho / Julho','Crie um cardápio sazonal de doces e pratos típicos (quentinhas juninas, quentão, bolos) para venda corporativa e eventos.'),
('alim','dia-da-pizza','Dia da Pizza',7,10,'10/07','Crie a "Noite da Pizza": borda recheada grátis na compra de pizza grande ou compre uma e leve a segunda com 50% de desconto.'),
('alim','dia-da-cachaca','Dia da Cachaça',9,13,'13/09','Monte kits presenteáveis de cachaças premiadas acompanhadas de copos shot, xaropes e receitas de caipirinha.'),
('alim','dia-mundial-do-veganismo','Dia Mundial do Veganismo',11,1,'01/11','Destaque opções plant-based no cardápio, ofereça cupons para clientes novos no segmento e lance pratos veganos exclusivos.'),
('alim','natal',null,null,null,'Dezembro (Festas de Fim de Ano)','Encomendas antecipadas de ceias de Natal/Ano Novo, cestas corporativas presenteáveis e pacotes de espumantes.'),
-- ARTESANATO
('arte','dia-da-mulher',null,null,null,'08/03','Crie mimos personalizados em pequena escala para empresas distribuírem para suas colaboradoras e clientes.'),
('arte','dia-do-artesao',null,null,null,'19/03','Promoção de insumos (linhas, tintas, tecidos) para artesãos e workshops/lives com demonstração de técnicas.'),
('arte','dia-das-maes',null,null,null,'Maio','Destaque presentes afetivos e sob medida (bordados, cerâmicas com nomes, quadros familiares) com prazo de encomenda antecipado.'),
('arte','dia-dos-namorados',null,null,null,'12/06','Caixas de memórias artesanais, álbuns scrapbook personalizados e kits "Amor em Detalhes" para casais.'),
('arte','dia-dos-avos','Dia dos Avós',7,26,'26/07','Monte produtos de conforto e nostalgia (panos de prato bordados, canecas artesanais, peças em crochê/tricô).'),
('arte','setembro-amarelo','Setembro Amarelo',9,10,'Setembro','Crie peças decorativas amarelas com mensagens inspiradoras de acolhimento e destine parte do lucro para ONGs locais.'),
('arte','natal',null,null,null,'Dezembro','Guirlandas, enfeites de árvore sob encomenda, lembrancinhas corporativas e kits presenteáveis "Handmade".'),
-- BELEZA E COSMETICOS
('bele','dia-da-mulher',null,null,null,'08/03','Kits de autocuidado ("Spa em Casa") acompanhados de brindes como saboneteiras, faixas de cabelo ou amostras.'),
('bele','dia-do-perfume','Dia do Perfume',3,21,'21/03','Realize testes de fragrâncias (amostras em compras), desconto na compra do segundo frasco e consultoria olfativa.'),
('bele','dia-das-maes',null,null,null,'Maio','É a principal data do ano: crie caixas de presente premium com linhas corporais, faciais e perfumaria fina.'),
('bele','dia-dos-namorados',null,null,null,'12/06','Kits duplos ("Para Ele & Para Ela"), óleos de massagem e maquiagens com paletas de cores para datas românticas.'),
('bele','dia-do-homem','Dia do Homem',7,15,'15/07','Destaque a linha de grooming masculina (shampoo de barba, óleos, balms, pós-barba) com desconto progressivo.'),
('bele','dia-do-maquiador','Dia do Maquiador',10,13,'13/10','Ofereça descontos para profissionais (via cadastro de CNPJ/CPF), combos de pincéis e paletas de alta fixação.'),
('bele','outubro-rosa','Outubro Rosa',10,1,'Outubro','Lance uma edição especial de produto com embalagem rosa e destine uma porcentagem das vendas ao combate ao câncer.'),
('bele','consciencia-negra','Dia da Consciência Negra',11,20,'20/11','Campanhas focadas na diversidade: destaque bases com ampla gama de tons e produtos para cabelos crespos/cacheados.'),
('bele','verao-dezembro-laranja','Verão & Dezembro Laranja',12,1,'Dezembro','Promoções de protetores solares, bronzeadores, iluminadores corporais e kits de proteção UV para férias de fim de ano.'),
-- CASA E DECORACAO
('casa','mes-da-organizacao','Mês da Organização',1,2,'Janeiro','Ofertas de caixas organizadoras, nichos, cabides e itens funcionais com a campanha "Casa Nova, Vida Nova".'),
('casa','dia-do-consumidor',null,null,null,'15/03','Mega saldo de móveis e itens de iluminação com frete grátis ou parcelamento estendido.'),
('casa','virada-estacao-outono','Virada de Estação: Outono',3,20,'20/03 (Início do Outono)','Destaque mantas para sofá, capas de almofada em tons quentes, velas aromáticas e tapetes com temática de aconchego.'),
('casa','dia-das-maes',null,null,null,'Maio','Enfatize aparelhos de jantar, itens de mesa posta, faqueiros e eletroportáteis com embalagem especial para presente.'),
('casa','virada-estacao-primavera','Virada de Estação: Primavera',9,22,'22/09 (Início da Primavera)','Campanhas de jardinagem, vasos ornamentais, itens para varanda e estampas florais.'),
('casa','dia-do-designer-de-interiores','Dia do Designer de Interiores',10,30,'30/10','Ofereça um programa de parceria/comissionamento para profissionais de arquitetura e design de interiores.'),
('casa','black-friday',null,null,null,'Nov / Dez','Campanha "Prepare sua Casa para Receber a Família": ofertas em sofás, mesas de jantar, reforma rápida e decoração de Natal.'),
-- ELETRONICOS E GADGETS
('elet','dia-do-consumidor',null,null,null,'15/03','Queima de estoque de virada de ano em smartphones, carregadores e cabos com cupons relâmpago.'),
('elet','dia-dos-pais',null,null,null,'Agosto','Destaque smartwatches, fones de ouvido com cancelamento de ruído, barbeadores elétricos e gadgets automotivos.'),
('elet','dia-do-gamer','Dia do Gamer',8,29,'29/08','Promoções de periféricos gamer (teclados mecânicos, mouses, headsets), monitores com alta taxa de atualização e cadeiras.'),
('elet','dia-do-cliente',null,null,null,'15/09','Monte combos "Compre um Gadget e Leve o Acessório" (ex.: compre tablet, ganhe a capa/película com 50% OFF).'),
('elet','dia-do-profissional-de-ti','Dia do Profissional de TI',10,19,'19/10','Descontos em equipamentos de redes, hardware de alta performance, nobreaks e componentes para PC.'),
('elet','black-friday',null,null,null,'Novembro (Black Friday & Cyber Monday)','A data mais importante do setor: ofertas agressivas com estoque limitado e foco em cashback e parcelamento.'),
('elet','novembro-azul','Novembro Azul',11,1,'Novembro','Ações de marketing para o público masculino promovendo tecnologia de saúde/esporte (smartbands/medidores).'),
-- ESPORTE E LAZER
('espo','ano-novo','Ano Novo',1,1,'Janeiro','Campanha "Meta 100% Fitness": combos de moda esportiva, garrafas térmicas, colchonetes e tênis de corrida.'),
('espo','dia-do-esportista','Dia do Esportista',2,19,'19/02','Cupons de desconto por modalidade (corrida, crossfit, futebol, natação) e desafios virtuais nas redes sociais.'),
('espo','dia-mundial-da-saude',null,null,null,'07/04','Promova produtos para treino em casa (elásticos, halteres, cordas) e faça parcerias com academias locais.'),
('espo','dia-da-bicicleta','Dia da Bicicleta',6,3,'03/06','Desconto na revisão de bikes, venda de capacetes, luzes de sinalização e vestuário para ciclistas.'),
('espo','dia-do-skatista','Dia do Skatista',6,21,'21/06','Promoções de shapes, rodas, proteções e itens de moda streetwear.'),
('espo','dia-do-educador-fisico','Dia do Educador Físico',9,1,'01/09','Ofereça cupom de desconto exclusivo para personal trainers indicarem aos seus alunos.'),
('espo','virada-estacao-verao','Virada de Estação: Verão',12,21,'Dezembro (Chegada do Verão)','Destaque barracas de praia, itens de camping, pesca, pranchas, stand-up paddle e vestuário com proteção UV.'),
-- INFANTIL E BRINQUEDOS
('infa','volta-as-aulas',null,null,null,'Jan / Fev','Combos de mochilas, lancheiras, estojos e papelaria com descontos para compra de mais de um item.'),
('infa','dia-mundial-da-infancia','Dia Mundial da Infância',3,21,'21/03','Foco em brinquedos educativos, jogos de tabuleiro em família e livros infantis.'),
('infa','abril-azul','Abril Azul (Autismo)',4,2,'Abril','Destaque brinquedos sensoriais, mordedores, jogos pedagógicos e ambiente de loja amigável a neurodivergentes.'),
('infa','dia-das-maes',null,null,null,'Maio','Foco em moda bebê, enxoval completo, carrinhos e bolsas maternidade com opção de lista de presentes.'),
('infa','dia-dos-avos','Dia dos Avós',7,26,'26/07','Campanha "Presente do Vovô e da Vovó": sugestões de mimos de baixo ticket e jogos para brincar em conjunto.'),
('infa','dia-das-criancas',null,null,null,'12/10','Pico de vendas: feiras de brinquedos, oficinas infantis na loja física e brinde surpresa em compras acima de determinado valor.'),
('infa','natal',null,null,null,'Dezembro','Destaque os brinquedos mais desejados do ano (bicicletas, videogames, bonecas colecionáveis) com serviço de embrulho para presente.'),
-- JOIAS E SEMIJOIAS
('joia','dia-da-mulher',null,null,null,'08/03','Campanha de autopresente ("Você merece brilhar") com descontos em anéis, brincos delicados e correntes.'),
('joia','dia-das-maes',null,null,null,'Maio','Maior pico do setor: coleções temáticas ("Mãe e Filhos"), relicários e peças personalizadas com gravação de nomes/iniciais.'),
('joia','dia-dos-namorados',null,null,null,'12/06','Alianças de compromisso, solitários, anéis de noivado e gargantilhas românticas com gravação gratuita.'),
('joia','dia-dos-avos','Dia dos Avós',7,26,'26/07','Pingentes com árvore da família, berloques de netos e medalhas personalizadas.'),
('joia','dia-dos-pais',null,null,null,'Agosto','Destaque correntes de prata/ouro masculinas, pulseiras de couro/aço, relógios e abotoaduras.'),
('joia','reveillon','Réveillon',12,31,'Novembro / Dezembro (Formaturas & Réveillon)','Anéis de formatura por área do conhecimento e peças com pedrarias/brilho para looks de Ano Novo.'),
-- MODA E ACESSORIOS
('moda','virada-estacao-outono','Virada de Estação: Outono',3,20,'Março / Abril (Outono/Inverno)','Evento de troca de coleção (desfile online, coquetel em loja) para apresentar casacos, tricôs e botas.'),
('moda','dia-das-maes',null,null,null,'Maio','Combos de moda feminina, bolsas, lenços e kits "Mãe e Filha" combinando estampas.'),
('moda','dia-dos-namorados',null,null,null,'12/06','Moda íntima, lingeries, moda noite e vitrine especial com sugestões para "Presentear seu Amor".'),
('moda','dia-dos-pais',null,null,null,'Agosto','Moda masculina, moda social, calçados e acessórios (carteiras e cintos) em embalagem especial.'),
('moda','virada-estacao-primavera','Virada de Estação: Primavera',9,22,'Setembro / Outubro (Primavera/Verão)','Destaque moda praia, óculos de sol, vestidos leves, shorts e peças coloridas.'),
('moda','dia-do-croche','Dia do Crochê / Moda Artesanal',9,22,'22/09','Valorize peças em crochê, tricô e trabalhos manuais na vitrine, com conteúdo sobre o processo produtivo.'),
('moda','natal',null,null,null,'Dezembro (Natal & Réveillon)','Araras dedicadas a "Roupas para o Réveillon" (branco, amarelo, prateado, dourado) e roupas formais para festas corporativas.'),
-- OUTROS / SERVICOS
('outr','ano-novo','Ano Novo',1,1,'Janeiro','Venda de auditorias, consultorias, cursos de capacitação e planejamentos financeiros ("Comece o Ano Organizado").'),
('outr','dia-da-educacao','Dia da Educação',4,28,'28/04','Desconto em matrículas de pós-graduação, treinamentos corporativos e plataformas de e-learning.'),
('outr','dia-do-advogado','Dia do Advogado',8,11,'11/08','Promoção de softwares jurídicos, cursos de atualização de leis e serviços de contabilidade especializada.'),
('outr','dia-do-cliente',null,null,null,'15/09','Ações de fidelização, renovação de contrato anual com desconto especial ou upgrade gratuito de plano.'),
('outr','outubro-rosa','Outubro Rosa',10,1,'Outubro (B2B)','Ofereça palestras corporativas e workshops sobre saúde feminina para RHs de empresas.'),
('outr','black-friday',null,null,null,'Novembro (Black Friday de Serviços)','Venda anuidades de software (SaaS), mentorias e contratos de prestação de serviço com valor promocional.'),
-- PET SHOP
('pet','dia-nacional-dos-animais','Dia Nacional dos Animais',3,14,'14/03','Feira de adoção responsável na loja física, check-up veterinário promocional e doação de ração.'),
('pet','maio-amarelo','Maio Amarelo',5,1,'Maio','Destaque acessórios de transporte e segurança para carros (cintos de segurança pet, caixas de transporte, capas de banco).'),
('pet','dia-do-gato','Dia Internacional do Gato',8,8,'08/08','"Dia dos Felinos": descontos em arranhadores, sachês, caixas de areia, brinquedos interativos e fontes de água.'),
('pet','dia-do-cachorro','Dia do Cachorro',8,26,'26/08','Combos de petiscos, brinquedos mordedores e banho com hidratação gratuita.'),
('pet','dia-do-veterinario','Dia do Médico Veterinário',9,9,'09/09','Divulgue a equipe de veterinários, palestras sobre prevenção de doenças e vacinação em dia.'),
('pet','dia-mundial-dos-animais',null,null,null,'04/10','Dia de "Banho & Tosa Especial" com brinde exclusivo (bandanas/laços) e fotos dos clientes nas redes sociais.'),
('pet','reveillon','Réveillon',12,31,'Dezembro (Férias e Festas)','Venda florais e calmantes naturais para amenizar o barulho de fogos, protetores de patinhas e guias de viagem.'),
-- SAUDE E SUPLEMENTOS
('saud','dia-mundial-da-saude',null,null,null,'07/04','Check-up de saúde (aferição de pressão/glicemia na loja) e descontos em multivitamínicos e ômega 3.'),
('saud','saude-mental','Saúde Mental',5,5,'05/05 (Jan/Maio)','Destaque produtos para sono e ansiedade: magnésio inositol, melatonina, triptofano e chás calmantes.'),
('saud','dia-do-diabetes','Dia do Diabetes',6,26,'26/06','Campanhas para produtos zero açúcar, adoçantes naturais (stevia/eritritol), medidores de glicemia e fibras.'),
('saud','dia-do-nutricionista','Dia do Nutricionista',8,31,'31/08','Parcerias com nutricionistas (cupons de indicação) e descontos em creatina, whey e aminoácidos.'),
('saud','dia-do-educador-fisico','Dia do Educador Físico',9,1,'01/09','Combos de performance esportiva: pré-treinos, termogênicos e coqueteleiras de brinde.'),
('saud','dia-do-medico','Dia do Médico',10,18,'18/10','Ofereça amostras grátis para médicos prescritores e programas B2B de relacionamento institucional.'),
('saud','dia-do-dentista','Dia do Dentista',10,25,'25/10','Promoções de colutórios sem álcool, escovas elétricas, fios dentais especiais e suplementos para cicatrização pós-cirúrgica.'),
('saud','novembro-azul','Novembro Azul',11,1,'Novembro','Campanha de saúde masculina com kits de vitaminas específicas para a saúde do homem e da próstata.'),
('saud','virada-estacao-verao','Virada de Estação: Verão',12,21,'Dezembro (Operação Verão)','Foco em emagrecimento saudável, suplementação detox, colágeno hidrolisado e protetores solares orais.');

-- 1) cria datas que ainda nao existem
insert into public.commercial_dates (id, slug, name, description, tip, rule_type, month, day, lead_days, is_active, sort_order)
select gen_random_uuid(), x.slug, x.name, x.tip, x.tip, 'fixed', x.m, x.d, 7, true,
  (select coalesce(max(sort_order),0) from public.commercial_dates) + row_number() over (order by x.m, x.d)
from (select distinct on (slug) * from _d where m is not null order by slug) x
where not exists (select 1 from public.commercial_dates c where c.slug = x.slug);

-- 2) vincula data x setor
insert into public.commercial_date_sectors (commercial_date_id, sector_id)
select distinct c.id, s.id
from _d d
join _map mp on mp.k = d.k
join public.commercial_dates c on c.slug = d.slug
join public.sectors s on lower(s.slug || ' ' || s.name) ~ mp.rx
where not exists (select 1 from public.commercial_date_sectors l where l.commercial_date_id = c.id and l.sector_id = s.id);

-- 3) dicas por setor
insert into public.commercial_date_tips (commercial_date_id, sector_id, period_label, tip)
select c.id, s.id, d.periodo, d.tip
from _d d
join _map mp on mp.k = d.k
join public.commercial_dates c on c.slug = d.slug
join public.sectors s on lower(s.slug || ' ' || s.name) ~ mp.rx
on conflict (commercial_date_id, sector_id) do update set tip = excluded.tip, period_label = excluded.period_label;

drop table _d;
drop table _map;


end $do$;

select s.name as setor, count(t.id) as dicas
from public.sectors s
left join public.commercial_date_tips t on t.sector_id = s.id
group by 1 order by 1;