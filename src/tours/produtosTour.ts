import type { TourStep } from '@/hooks/usePageTour';

export const produtosTour: TourStep[] = [
  {
    element: '[data-tour="prod-novo"]',
    title: 'Cadastre um produto',
    description: 'Adicione um produto manualmente com foto, pre\u00e7o e link da p\u00e1gina de venda.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-categorias"]',
    title: 'Organize por categorias',
    description: 'Agrupe os produtos em categorias para encontr\u00e1-los mais r\u00e1pido e vincular aos v\u00eddeos com facilidade.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-importar"]',
    title: 'Importe o seu cat\u00e1logo',
    description: 'Traga os produtos da sua loja de uma vez, sem digitar um por um. \u00c9 o caminho mais r\u00e1pido para come\u00e7ar.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-metricas"]',
    title: 'Vis\u00e3o r\u00e1pida do cat\u00e1logo',
    description: 'Veja quantos produtos voc\u00ea tem, quantos est\u00e3o ativos e quantos j\u00e1 est\u00e3o vinculados a v\u00eddeos.',
    side: 'bottom',
  },
  {
    element: '[data-tour="prod-lista"]',
    title: 'Gerencie a lista',
    description: 'Busque por nome ou SKU, ative ou pause produtos, confira o estoque, sincronize, edite ou exclua. Marque v\u00e1rios para agir em massa.',
    side: 'top',
  },
];