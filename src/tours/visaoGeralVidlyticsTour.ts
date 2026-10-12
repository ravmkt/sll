import type { TourStep } from '@/hooks/usePageTour';

export const visaoGeralTour: TourStep[] = [
  {
    element: '[data-tour="vg-faturamento"]',
    title: 'Quanto os vídeos faturam',
    description: 'Pedidos aguardando pagamento, vendas confirmadas e comissões do Clube SLL. Troque o período no filtro acima.',
    side: 'bottom',
  },
  {
    element: '[data-tour="vg-consumo"]',
    title: 'Consumo do seu plano',
    description: 'Acompanhe visualizações, armazenamento, páginas com vídeo e o ciclo da assinatura em relação ao limite do plano.',
    side: 'bottom',
  },
  {
    element: '[data-tour="vg-desempenho"]',
    title: 'Desempenho dos vídeos',
    description: 'Evolução de visualizações, cliques e conversões ao longo do tempo. Clique em Ver detalhes para abrir Resultados.',
    side: 'top',
  },
  {
    element: '[data-tour="vg-top"]',
    title: 'Vídeos mais assistidos',
    description: 'Descubra quais vídeos mais atraem o público e replique o que está funcionando.',
    side: 'top',
  },
  {
    element: '[data-tour="vg-indique"]',
    title: 'Indique e ganhe',
    description: 'Compartilhe o seu link, indique outras lojas e receba comissão recorrente pelo Clube SLL.',
    side: 'top',
  },
];