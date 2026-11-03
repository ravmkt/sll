import type { TourStep } from '@/hooks/usePageTour';
import type { TagRule } from '@/tours/TourTagger';

export const RESULTADOS_TOUR: TourStep[] = [
  { element: '[data-tour="rs-subabas"]', title: 'Sub-abas de an\u00e1lise', description: 'Alterne entre Vis\u00e3o Geral, V\u00eddeos, Reten\u00e7\u00e3o e Insights para analisar o desempenho por \u00e2ngulos diferentes.', side: 'bottom' },
  { element: '[data-tour="rs-financeiro"]', title: 'Resultados financeiros', description: 'Vendas e receita atribu\u00eddas aos v\u00eddeos. Os valores reais aparecem quando a conex\u00e3o com os pedidos da loja estiver ativa.', side: 'bottom' },
  { element: '[data-tour="rs-performance"]', title: 'Performance e intera\u00e7\u00e3o', description: 'Visualiza\u00e7\u00f5es, cliques em CTA, engajamento social e CTR dos seus v\u00eddeos no per\u00edodo.', side: 'bottom' },
  { element: '[data-tour="rs-grafico"]', title: 'Evolu\u00e7\u00e3o di\u00e1ria e funil', description: 'Acompanhe dia a dia como visualiza\u00e7\u00f5es e cliques evoluem. Use os controles do gr\u00e1fico para ajustar a visualiza\u00e7\u00e3o.', side: 'top' },
  { element: '[data-tour="rs-benchmark"]', title: 'Benchmark do setor', description: 'Compare seus n\u00fameros com a m\u00e9dia de mercado e veja onde h\u00e1 espa\u00e7o para melhorar.', side: 'top' },
];
export const RESULTADOS_TAGS: TagRule[] = [
  ['rs-subabas', /^visao geral$/, 'parent'],
  ['rs-grafico', /^evolucao diaria de engajamento/, 'card'],
  ['rs-benchmark', /benchmark/, 'card'],
];

export const STORIES_TOUR: TourStep[] = [
  { element: '[data-tour="st-novo"]', title: 'Novo Story', description: 'Crie uma r\u00e9gua de Stories com v\u00eddeos, layout, seletor CSS e p\u00e1ginas onde ela deve aparecer.', side: 'bottom' },
  { element: '[data-tour="st-filtros"]', title: 'Busca e filtros', description: 'Procure pelo nome e filtre por Todos, Ativos ou Inativos.', side: 'bottom' },
  { element: '[data-tour="st-tabela"]', title: 'Seus Stories', description: 'Veja layout, v\u00eddeos, p\u00e1ginas, visualiza\u00e7\u00f5es, CTR e status. Use os \u00edcones para editar ou excluir e as caixas para excluir v\u00e1rios de uma vez.', side: 'top' },
];

export const BIBLIOTECA_TOUR: TourStep[] = [
  { element: '[data-tour="bi-acoes"]', title: 'Adicionar m\u00eddias', description: 'Envie arquivos, adicione v\u00eddeos por URL (YouTube ou MP4) e gerencie sua biblioteca por aqui.', side: 'bottom' },
  { element: '[data-tour="bi-pesquisa"]', title: 'Pesquisa', description: 'Encontre rapidamente uma m\u00eddia pelo nome do arquivo.', side: 'bottom' },
  { element: '[data-tour="bi-tabela"]', title: 'Suas m\u00eddias', description: 'Veja produto e story vinculados, tamanho e status. Edite, visualize, baixe ou exclua cada arquivo.', side: 'top' },
];

export const COMENTARIOS_TOUR: TourStep[] = [
  { element: '[data-tour="co-resumo"]', title: 'Resumo dos coment\u00e1rios', description: 'Vis\u00e3o r\u00e1pida do que est\u00e1 aguardando modera\u00e7\u00e3o e do volume de coment\u00e1rios.', side: 'bottom' },
  { element: '[data-tour="co-filtros"]', title: 'Busca e filtros', description: 'Pesquise por autor ou texto e filtre os coment\u00e1rios para encontrar o que precisa.', side: 'bottom' },
  { element: '[data-tour="co-tabela"]', title: 'Modera\u00e7\u00e3o', description: 'Aprove, rejeite, responda ou exclua cada coment\u00e1rio. As respostas aparecem para o cliente com a identidade da sua loja.', side: 'top' },
];
export const COMENTARIOS_TAGS: TagRule[] = [['co-tabela', /./, 'table']];

export const APARENCIA_TOUR: TourStep[] = [
  { element: '[data-tour="ap-estilos"]', title: 'Seus Estilos', description: 'Estilos visuais criados e salvos por voc\u00ea para os widgets. Edite, exclua ou defina qual \u00e9 o padr\u00e3o.', side: 'bottom' },
  { element: '[data-tour="ap-novo"]', title: 'Criar Novo Estilo', description: 'Monte um estilo do zero: cores, bordas, bot\u00f5es e textos dos widgets.', side: 'left' },
  { element: '[data-tour="ap-templates"]', title: 'Templates prontos', description: 'Parta de um modelo pronto: visualize, personalize e use como padr\u00e3o da loja.', side: 'top' },
];

export const BIBLIOTECA_TAGS: TagRule[] = [['bi-tabela', /./, 'table']];