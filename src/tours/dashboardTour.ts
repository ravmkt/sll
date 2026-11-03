import type { TourStep } from '@/hooks/usePageTour';
import type { TagRule } from '@/tours/TourTagger';

export const DASHBOARD_TOUR: TourStep[] = [
  {
    element: '[data-tour="kpis"]',
    title: 'Seus n\u00fameros em um s\u00f3 lugar',
    description: 'Acompanhe seus resultados para saber o que est\u00e1 funcionando na sua loja.',
  },
  {
    element: '[data-tour="modules"]',
    title: 'Seu ecossistema completo',
    description: 'Aqui ficam todos os m\u00f3dulos. Acesse cada um para turbinar a convers\u00e3o e analisar seus resultados.',
    side: 'top',
  },
  {
    element: '[data-tour="acesso-rapido"]',
    title: 'Acesso r\u00e1pido',
    description: 'Atalhos para o que voc\u00ea mais usa: v\u00eddeos e cat\u00e1logo, Insights do Noah com dicas pr\u00e1ticas para a sua loja, instala\u00e7\u00e3o dos m\u00f3dulos, assinatura e planos e o Clube SLL.',
    side: 'right',
  },
  {
    element: '[data-tour="calendar"]',
    title: 'Datas que importam',
    description: 'Veja as pr\u00f3ximas datas comemorativas e planeje suas campanhas e lives com anteced\u00eancia.',
    side: 'left',
  },
  {
    element: '[data-tour="club"]',
    title: 'Clube SLL',
    description: 'Indique lojas e receba benef\u00edcios recorrentes. Suba de n\u00edvel para desbloquear benef\u00edcios exclusivos.',
    side: 'top',
  },
  {
    element: '[data-tour="academy"]',
    title: 'SLL Academy',
    description: 'Aulas pr\u00e1ticas e estrat\u00e9gias reais para acelerar o seu e-commerce. Assista e se inscreva no canal.',
    side: 'top',
  },
];

export const DASHBOARD_TAGS: TagRule[] = [['acesso-rapido', /^acesso rapido$/, 'card']];