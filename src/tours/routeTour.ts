import { isVisible, type TourStep } from '@/hooks/usePageTour';

type Intro = { title: string; desc: string };

const INTRO: Record<string, Intro> = {
  '/dashboard/settings': { title: 'Configura\u00e7\u00f5es da loja', desc: 'Aqui voc\u00ea ajusta os dados da loja, a plataforma conectada, o WhatsApp e as m\u00e9tricas.' },
  '/dashboard/integracao': { title: 'Instala\u00e7\u00e3o & Script', desc: 'Copie o script do SLL e confira se ele est\u00e1 instalado e funcionando na sua loja.' },
  '/dashboard/assinaturas': { title: 'Assinatura & Planos', desc: 'Veja seu plano atual, os m\u00f3dulos contratados e o status da assinatura.' },
  '/dashboard/planos': { title: 'Planos', desc: 'Compare os planos e escolha o ideal para a sua loja.' },
  '/dashboard/dicas': { title: 'Insights do Noah', desc: 'Dicas pr\u00e1ticas do Noah para vender mais com seus v\u00eddeos e lives.' },
  '/dashboard/pedidos-dos-lojistas': { title: 'Pedidos dos lojistas', desc: 'Sugira melhorias e vote nas ideias de outros lojistas.' },
  '/dashboard/afiliados': { title: 'Clube SLL', desc: 'Indique lojistas e acompanhe suas indica\u00e7\u00f5es e comiss\u00f5es.' },
  '/dashboard/metricas': { title: 'M\u00e9tricas', desc: 'Acompanhe o desempenho da sua loja em um s\u00f3 lugar.' },
  '/dashboard/medidas': { title: 'Tabela de medidas', desc: 'Cadastre e organize as tabelas de medidas dos seus produtos.' },
};

const EXCLUDED = ['/dashboard/produtos', '/dashboard/onboarding', '/dashboard/checkout', '/dashboard/modules/'];
const DEFAULT_DESC = 'Veja o que voc\u00ea pode fazer nesta p\u00e1gina.';
const BLOCK_DESC = 'Confira e ajuste as op\u00e7\u00f5es desta \u00e1rea. Role a p\u00e1gina para ver o restante.';

export function isRouteTourPath(p: string): boolean {
  if (!p.startsWith('/dashboard') || p === '/dashboard' || p === '/dashboard/') return false;
  return !EXCLUDED.some((e) => (e.endsWith('/') ? p.startsWith(e) : p === e || p.startsWith(e + '/')));
}

export function routeTourKey(p: string): string {
  const s = p.replace(/^\/dashboard\/?/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return 'hub-' + (s || 'home');
}

function introFor(p: string): Intro | undefined {
  const k = Object.keys(INTRO).filter((x) => p === x || p.startsWith(x + '/')).sort((a, b) => b.length - a.length)[0];
  return k ? INTRO[k] : undefined;
}

const txt = (e: Element | null | undefined) => (e?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);

export function buildRouteSteps(pathname: string): TourStep[] {
  const main = document.querySelector('main');
  if (!main) return [];
  main.querySelectorAll('[data-rt]').forEach((e) => e.removeAttribute('data-rt'));
  const intro = introFor(pathname);
  const steps: TourStep[] = [];

  const outside = (e: Element) => !e.closest('header');
  const h =
    Array.from(main.querySelectorAll('h1')).find((x) => outside(x) && isVisible(x)) ||
    Array.from(main.querySelectorAll('h2')).find((x) => outside(x) && isVisible(x));
  if (h) {
    h.setAttribute('data-rt', 'title');
    steps.push({
      element: '[data-rt="title"]',
      title: intro?.title || txt(h) || 'Esta p\u00e1gina',
      description: intro?.desc || DEFAULT_DESC,
      side: 'bottom',
    });
  }

  const cands = Array.from(
    main.querySelectorAll('section, form, [class*="rounded-2xl"], [class*="rounded-xl"]')
  ).filter((el) => {
    if (el.closest('header') || el.closest('[class*="fixed"]') || !isVisible(el)) return false;
    const r = el.getBoundingClientRect();
    return r.height >= 80 && r.width >= 240;
  });
  const blocks: Element[] = [];
  for (const el of cands) {
    if (blocks.some((b) => b.contains(el))) continue;
    if (cands.filter((c) => c !== el && el.contains(c)).length >= 2) continue;
    blocks.push(el);
    if (blocks.length === 4) break;
  }
  blocks.forEach((b, i) => {
    b.setAttribute('data-rt', 'b' + (i + 1));
    steps.push({
      element: '[data-rt="b' + (i + 1) + '"]',
      title: txt(b.querySelector('h2,h3,h4,legend')) || 'Se\u00e7\u00e3o ' + (i + 1),
      description: BLOCK_DESC,
      side: 'bottom',
    });
  });

  if (document.querySelector('aside nav')) {
    steps.push({
      element: 'aside nav',
      title: 'Menu do Hub',
      description: 'Use o menu para navegar entre Vis\u00e3o Geral, Produtos, Configura\u00e7\u00f5es, Planos e os m\u00f3dulos. Em cada p\u00e1gina, este bot\u00e3o mostra o tour dela.',
      side: 'right',
    });
  }
  return steps;
}