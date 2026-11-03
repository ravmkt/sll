import type { TourStep } from '@/hooks/usePageTour';
import type { TagRule } from '@/tours/TourTagger';

export const visaoGeralTour: TourStep[] = [
  {
    element: '[data-tour="vg-faturamento"]',
    title: 'Quanto os v\u00eddeos faturam',
    description: 'Pedidos aguardando pagamento, vendas confirmadas e comiss\u00f5es do Clube SLL. Troque o per\u00edodo no filtro acima.',
    side: 'bottom',
  },
  {
    element: '[data-tour="vg-consumo"]',
    title: 'Consumo',
    description: 'Acompanhe visualiza\u00e7\u00f5es, armazenamento, p\u00e1ginas com v\u00eddeo e o ciclo da assinatura em rela\u00e7\u00e3o ao limite do plano.',
    side: 'bottom',
  },
  {
    element: '[data-tour="vg-desempenho"]',
    title: 'Desempenho dos v\u00eddeos',
    description: 'Evolu\u00e7\u00e3o de visualiza\u00e7\u00f5es, cliques e convers\u00f5es ao longo do tempo. Clique em Ver detalhes para abrir Resultados.',
    side: 'top',
  },
  {
    element: '[data-tour="vg-datas"]',
    title: 'Datas comerciais',
    description: 'Veja as pr\u00f3ximas datas fortes de venda do seu setor e planeje seus v\u00eddeos e campanhas com anteced\u00eancia.',
    side: 'top',
  },
  {
    element: '[data-tour="vg-noah"]',
    title: 'Dica do Noah',
    description: 'Dicas pr\u00e1ticas do Noah para a \u00e9poca do ano e o nicho da sua loja. Use Ver mais dicas para ver todas.',
    side: 'top',
  },
  {
    element: '[data-tour="vg-indique"]',
    title: 'Clube SLL',
    description: 'Compartilhe o seu link, indique outras lojas e receba comiss\u00e3o recorrente pelo Clube SLL.',
    side: 'top',
  },
  {
    element: '[data-tour="academy"]',
    title: 'SLL Academy',
    description: 'Aulas r\u00e1pidas para usar o Vidlytics e vender mais com v\u00eddeos. Assista aqui e acompanhe o canal no YouTube.',
    side: 'top',
  },
];

export const VISAO_GERAL_TAGS: TagRule[] = [
  ['vg-datas', /^proximas datas comerciais$/, 'card'],
  ['vg-noah', /^dica do noah$/, 'card'],
];