DO $$
DECLARE
  r record;
  k int;
  v_id uuid;
  v_sec uuid;
  v_slug text;
  v_name text;
  v_tip text;
  v_lbl text;
BEGIN
  -- 1) Datas novas (so entram se nao existirem por slug ou nome); ligadas a todos os setores
  FOR r IN SELECT * FROM (VALUES
    ('corpus-christi','Corpus Christi','easter_offset',NULL::int,60,NULL::int,NULL::int,14,'Ponto facultativo federal: confirme as regras locais e planeje ofertas de feriado prolongado.'),
    ('dia-do-amigo','Dia do Amigo','fixed',7,20,NULL,NULL,21,'Boa data para indicacoes e ofertas para duplas ou grupos.'),
    ('dia-do-cliente','Dia do Cliente','fixed',9,15,NULL,NULL,21,'Foque em fidelizacao, recompra e agradecimento a base ativa.'),
    ('dia-da-arvore','Dia da Arvore','fixed',9,21,NULL,NULL,14,'Gancho para sustentabilidade e consumo consciente; so comunique origem de materiais que possa comprovar.'),
    ('dia-dos-professores','Dia dos Professores','fixed',10,15,NULL,NULL,21,'Presentes e campanhas de agradecimento; ofereca compra em grupo para turmas.'),
    ('halloween','Halloween','fixed',10,31,NULL,NULL,21,'Fantasias, decoracao, eventos e kits tematicos; informe faixa etaria e seguranca.'),
    ('consciencia-negra','Dia da Consciencia Negra','fixed',11,20,NULL,NULL,14,'Data de reflexao: trabalhe representatividade genuina, com credito e parcerias reais.'),
    ('black-friday','Black Friday','thanksgiving_offset',11,1,4,4,45,'Poucas ofertas fortes, com preco, estoque e prazo verificaveis; nao eleve precos antes da acao.'),
    ('cyber-monday','Cyber Monday','thanksgiving_offset',11,4,4,4,45,'Oportunidade complementar para vendas on-line: reaproveite o que sobrou com estoque confirmado.'),
    ('reveillon','Reveillon','fixed',12,31,NULL,NULL,30,'Festas, viagens, looks e alimentos; informe prazos de entrega e horarios.'),
    ('outubro-rosa-verde','Outubro Rosa e Verde','fixed',10,1,NULL,NULL,7,'Compartilhe informacao de fontes confiaveis e apoie iniciativas serias. Nao prometa prevencao ou tratamento nem use a causa como pressao de venda.'),
    ('novembro-azul-roxo','Novembro Azul e Roxo','fixed',11,1,NULL,NULL,7,'Promova informacao respeitosa; se houver parceria, identifique a organizacao e o destino da contribuicao. Evite estereotipos e aconselhamento clinico.'),
    ('dezembro-vermelho-laranja','Dezembro Vermelho e Laranja','fixed',12,1,NULL,NULL,7,'Priorize educacao e fontes confiaveis. Nao use medo para vender nem prometa protecao.'),
    ('data-dupla-10-10','10.10 - Data dupla','fixed',10,10,NULL,NULL,14,'Janela promocional do e-commerce: previa de ofertas com estoque e margem confirmados.'),
    ('data-dupla-11-11','11.11 - Data dupla','fixed',11,11,NULL,NULL,14,'Aquecimento para a Black Friday: selecao limitada e ofertas verificaveis.'),
    ('data-dupla-12-12','12.12 - Data dupla','fixed',12,12,NULL,NULL,14,'Ultima janela de presentes: pronta-entrega, vale-presente e retirada local.')
  ) AS t(slug,name,rule_type,month,day,weekday,nth,lead_days,tip)
  LOOP
    SELECT id INTO v_id FROM public.commercial_dates
     WHERE slug = r.slug OR lower(name) = lower(r.name) LIMIT 1;
    IF v_id IS NULL THEN
      BEGIN
        INSERT INTO public.commercial_dates (slug,name,description,tip,rule_type,month,day,weekday,nth,lead_days,is_active)
        VALUES (r.slug,r.name,r.tip,r.tip,r.rule_type,r.month,r.day,r.weekday,r.nth,r.lead_days,true)
        RETURNING id INTO v_id;
        INSERT INTO public.commercial_date_sectors (commercial_date_id, sector_id)
        SELECT v_id, id FROM public.sectors;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Nao inseriu %: %', r.slug, SQLERRM;
      END;
    END IF;
  END LOOP;

  -- 2) Dicas das datas duplas por setor
  FOR r IN SELECT * FROM (VALUES
    ('Alimentos e Bebidas','Teste um combo de boa margem por tempo limitado, com retirada agendada e ingredientes/alergenicos informados.','Lance menu ou kit de edicao limitada e vale-presente; planeje insumos e equipe para o pico.','Abra encomendas de ceias, sobremesas e cestas por tamanho de grupo, com prazos, horarios e politica de substituicao.'),
    ('Artesanato','Monte uma selecao de pecas prontas ou kits de menor valor; mostre dimensoes, materiais, cuidados e prazo real de producao.','Faca vitrine de pronta-entrega, sem desconto indiscriminado no trabalho sob encomenda.','Ofereca enfeites e presentes personalizados com data-limite realista para encomendas e uma selecao pronta para entrega.'),
    ('Beleza e Cosméticos','Divulgue kits de autocuidado para presente e servicos tematicos; nao associe cosmeticos a prevencao de doencas.','Ofereca produtos selecionados e pacotes de servicos com quantidade, validade e regras de cancelamento explicitas.','Abra a agenda de cabelo, maquiagem e unhas com horarios, sinal e regras de remarcacao; venda vales-presente.'),
    ('Casa e Decoração','Divulgue uma composicao completa com preco de cada item, alternativa economica e condicoes de entrega.','Crie ofertas por ambiente, incluindo mostruario com estado descrito; informe estoque, entrega e montagem.','Apresente mesa posta e decoracao natalina com dimensoes e data-limite de entrega; priorize itens prontos e retirada.'),
    ('Eletrônicos e Gadgets','Selecione acessorios ou kits compativeis e explique garantia e especificacoes.','Faca lista enxuta de ofertas com preco, estoque, garantia e prazo verificaveis; ofereca suporte de configuracao se puder cumprir.','Destaque pronta-entrega e vale-presentes; informe prazos por regiao e datas finais de retirada para o Natal.'),
    ('Esporte e Lazer','Monte kits por modalidade ou combo de aula experimental com equipamento.','Ofereca pacotes de aulas, manutencao e equipamentos com condicoes claras; beneficio para dupla sem comprometer a margem.','Venda kits de praia, camping e viagem e vouchers de aulas; informe datas de uso e regras de reagendamento.'),
    ('Infantil e Brinquedos','Mantenha o Dia das Criancas ativo: selecao por idade, interesse e orcamento, com faixa etaria e seguranca visiveis.','Prepare listas de presentes com estoque confirmado e alternativas equivalentes; explique prazo e troca antes da compra.','Lance catalogo de Natal por idade e orcamento; separe pronta-entrega de reposicao e informe a data final de envio.'),
    ('Joias e Semijoias','Lance pecas prontas para presentear (professores, festas), com medidas, materiais, cuidados e condicoes de troca.','Ofereca kits e ultimas unidades com preco e estoque transparentes; nao anuncie pecas como investimento.','Destaque presentes com gravacao e vale-presente; defina prazo final de personalizacao e tenha alternativas prontas.'),
    ('Moda e Acessórios','Crie looks completos por orcamento e sugira pecas que sirvam depois da data.','Organize ofertas por categoria e grade de tamanhos, com estoque atualizado, politica de troca e custo de entrega.','Mostre looks para festas e viagens por faixa de preco; promova retirada local e publique datas-limite de envio e troca.'),
    ('Outros / Serviços','Teste um pacote de entrada com escopo, duracao, agenda e preco definidos.','Venda pacotes, creditos ou planos com validade, limites de uso e cancelamento visiveis.','Venda vouchers e experiencias para presentear; deixe claros prazo de uso, agenda, recesso e remarcacao.'),
    ('Pet Shop','Monte kits de passeio, brinquedos e acessorios seguros que nao restrinjam visao, respiracao ou movimento.','Crie combos de reposicao conferindo lote, validade e compatibilidade; nao substitua produto sem consentimento do tutor.','Abra reservas de banho e tosa e hospedagem conforme a capacidade real; ofereca brinquedos e presentes seguros.'),
    ('Saúde e Suplementos','Compartilhe informacao confiavel (Outubro Rosa e Verde); venda apenas produtos autorizados, sem prometer prevencao ou tratamento.','Informe composicao, rotulo, modo de uso, validade e restricoes; nao estimule consumo excessivo.','Use informacao responsavel; kits dentro das regras, com rotulagem clara e sem alegacoes terapeuticas.')
  ) AS t(sector,a,b,c)
  LOOP
    SELECT id INTO v_sec FROM public.sectors WHERE lower(name) = lower(r.sector) LIMIT 1;
    IF v_sec IS NULL THEN
      RAISE NOTICE 'Setor nao encontrado: %', r.sector;
      CONTINUE;
    END IF;
    FOR k IN 1..3 LOOP
      v_slug := (ARRAY['data-dupla-10-10','data-dupla-11-11','data-dupla-12-12'])[k];
      v_name := (ARRAY['10.10 - Data dupla','11.11 - Data dupla','12.12 - Data dupla'])[k];
      v_tip  := (ARRAY[r.a, r.b, r.c])[k];
      v_lbl  := (ARRAY['Ate 10/10','Ate 11/11','Ate 12/12'])[k];
      SELECT id INTO v_id FROM public.commercial_dates
       WHERE slug = v_slug OR lower(name) = lower(v_name) LIMIT 1;
      IF v_id IS NULL THEN CONTINUE; END IF;
      DELETE FROM public.commercial_date_tips WHERE commercial_date_id = v_id AND sector_id = v_sec;
      INSERT INTO public.commercial_date_tips (commercial_date_id, sector_id, tip, period_label)
      VALUES (v_id, v_sec, v_tip, v_lbl);
      INSERT INTO public.commercial_date_sectors (commercial_date_id, sector_id)
      SELECT v_id, v_sec WHERE NOT EXISTS (
        SELECT 1 FROM public.commercial_date_sectors WHERE commercial_date_id = v_id AND sector_id = v_sec);
    END LOOP;
  END LOOP;
END $$;

select cd.name, cd.rule_type, cd.month, cd.day, count(t.*) as dicas
from public.commercial_dates cd
left join public.commercial_date_tips t on t.commercial_date_id = cd.id
where cd.slug in ('black-friday','cyber-monday','corpus-christi','data-dupla-10-10','data-dupla-11-11','data-dupla-12-12','halloween','novembro-azul-roxo')
group by 1,2,3,4 order by cd.month, cd.day;