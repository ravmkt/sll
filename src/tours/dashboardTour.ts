import type { TourStep } from '@/hooks/usePageTour';

export const DASHBOARD_TOUR: TourStep[] = [
  {
    element: '[data-tour="checklist"]',
    title: 'Seu checklist de ativação',
    description: 'Complete esses passos iniciais para integrar sua loja e deixar todas as ferramentas sincronizadas.',
  },
  {
    element: '[data-tour="modules"]',
    title: 'Seu ecossistema completo',
    description: 'Aqui ficam todos os seus aplicativos, como Vidlytics e Live Commerce. Acesse cada um para turbinar a conversão e analisar seus resultados.',
    side: 'top',
  },
  {
    element: '[data-tour="noah"]',
    title: 'Seu copiloto diário',
    description: 'O Noah analisa os números da sua loja e entrega diagnósticos práticos para você aplicar sem perder tempo.',
    side: 'top',
  },
  {
    element: '[data-tour="topbar"]',
    title: 'Tudo sob seu controle',
    description: 'Acesse suas integrações, dados da assinatura e suporte sempre que precisar.',
  },
];