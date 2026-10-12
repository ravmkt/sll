import type { TourStep } from '@/hooks/usePageTour';

export const produtosTour: TourStep[] = [
  {
    element: '[data-tour="prod-novo"]',
    title: 'Cadastre um produto',
    description: 'Adicione um produto manualmente com foto, preço e link da página de venda.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-importar"]',
    title: 'Importe o seu catálogo',
    description: 'Traga os produtos da sua loja de uma vez, sem digitar um por um. É o caminho mais rápido para começar.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-categorias"]',
    title: 'Organize por categorias',
    description: 'Agrupe os produtos em categorias para encontrá-los mais rápido e vincular aos vídeos com facilidade.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-metricas"]',
    title: 'Visão rápida do catálogo',
    description: 'Veja quantos produtos você tem, quantos estão ativos e quantos já estão vinculados a vídeos.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-lista"]',
    title: 'Gerencie a lista',
    description: 'Busque por nome ou SKU, ative ou pause produtos, confira o estoque, sincronize, edite ou exclua. Marque vários para agir em massa.',
    side: 'top',
  },
];