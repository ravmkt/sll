import type { TourStep } from '@/hooks/usePageTour';

export const DASHBOARD_TOUR: TourStep[] = [
  {
    element: '[data-tour="kpis"]',
    title: 'Seus números em um só lugar',
    description: 'Acompanhe visualizações, cliques e vendas assistidas dos seus módulos para saber o que está funcionando na sua loja.',
  },
  {
    element: '[data-tour="modules"]',
    title: 'Seu ecossistema completo',
    description: 'Aqui ficam todos os módulos. Acesse cada um para turbinar a conversão e analisar seus resultados.',
    side: 'top',
  },
  {
    element: '[data-tour="noah"]',
    title: 'Seu copiloto diário',
    description: 'O Noah analisa os números da sua loja e entrega diagnósticos práticos para você aplicar sem perder tempo.',
    side: 'top',
  },
  {
    element: '[data-tour="academy"]',
    title: 'SLL Academy',
    description: 'Aulas práticas e estratégias reais para acelerar o seu e-commerce. Assista e se inscreva no canal.',
    side: 'top',
  },
  {
    element: '[data-tour="club"]',
    title: 'Clube SLL',
    description: 'Indique lojas e receba 10% de comissão recorrente. Suba de nível para desbloquear benefícios exclusivos.',
    side: 'top',
  },
];