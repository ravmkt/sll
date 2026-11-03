import { isVisible, type TourStep } from '@/hooks/usePageTour';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Intro = { title: string; desc: string };

const INTRO: Record<string, Intro> = {
  '/dashboard/settings': { title: 'Configura\u00e7\u00f5es da loja', desc: 'Aqui voc\u00ea ajusta os dados da loja, a plataforma conectada, o WhatsApp e as m\u00e9tricas.' },
  '/dashboard/integracao': { title: 'Instala\u00e7\u00e3o & Script', desc: 'Copie o script do SLL e confira se ele est\u00e1 instalado e funcionando na sua loja.' },
  '/dashboard/assinaturas': { title: 'Assinatura & Planos', desc: 'Veja seu plano atual, os m\u00f3dulos contratados e o status da assinatura.' },
  '/dashboard/planos': { title: 'Planos', desc: 'Compare os planos e escolha o ideal para a sua loja.' },
  '/dashboard/metricas': { title: 'M\u00e9tricas', desc: 'Acompanhe o desempenho da sua loja em um s\u00f3 lugar.' },
  '/dashboard/medidas': { title: 'Tabela de medidas', desc: 'Cadastre e organize as tabelas de medidas dos seus produtos.' },
};

const EXCLUDED = ['/dashboard/produtos', '/dashboard/onboarding', '/dashboard/checkout', '/dashboard/modules/'];
const DEFAULT_DESC = 'Veja o que voc\u00ea pode fazer nesta p\u00e1gina.';
const BLOCK_DESC = 'Confira e ajuste as op\u00e7\u00f5es desta \u00e1rea. Role a p\u00e1gina para ver o restante.';

// Paginas com tour proprio: a chave muda para o tour reaparecer uma vez.
const VERSIONS: Record<string, string> = {
  '/dashboard/insights-noah': 'v2',
  '/dashboard/dicas': 'v2',
  '/dashboard/pedidos-dos-lojistas': 'v2',
  '/dashboard/afiliados': 'v4',
};

const clean = (p: string) => p.replace(/\/+$/, '') || '/';

export function isRouteTourPath(p: string): boolean {
  if (!p.startsWith('/dashboard') || p === '/dashboard' || p === '/dashboard/') return false;
  return !EXCLUDED.some((e) => (e.endsWith('/') ? p.startsWith(e) : p === e || p.startsWith(e + '/')));
}

export function routeTourKey(p: string): string {
  const s = p.replace(/^\/dashboard\/?/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const base = 'hub-' + (s || 'home');
  const v = VERSIONS[clean(p)];
  return v ? base + '-' + v : base;
}

function introFor(p: string): Intro | undefined {
  const k = Object.keys(INTRO).filter((x) => p === x || p.startsWith(x + '/')).sort((a, b) => b.length - a.length)[0];
  return k ? INTRO[k] : undefined;
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const txt = (e: Element | null | undefined) => (e?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);

function ownText(el: Element): string {
  let t = '';
  el.childNodes.forEach((n) => { if (n.nodeType === 3) t += n.textContent || ''; });
  return norm(t);
}

function cardOf(el: Element, minW = 200, minH = 80): Element | null {
  let n: Element | null = el;
  while (n && n.tagName !== 'MAIN' && n.tagName !== 'BODY') {
    const r = n.getBoundingClientRect();
    if (/rounded-/.test(n.getAttribute('class') || '') && r.height >= minH && r.width >= minW) return n;
    n = n.parentElement;
  }
  return null;
}

function find(main: Element, rx: RegExp, kind: 'section' | 'card' | 'self'): Element | null {
  const all = Array.from(main.querySelectorAll('h1,h2,h3,h4,p,span,div,button,label,a'));
  for (const e of all) {
    if (e.closest('header,aside,nav,[role="dialog"],.driver-popover') || !isVisible(e)) continue;
    if (!rx.test(ownText(e))) continue;
    if (kind === 'self') return e.closest('button') || e;
    if (kind === 'section') return e.closest('section') || e.parentElement;
    return cardOf(e) || cardOf(e, 100, 40) || e.parentElement;
  }
  return null;
}

function autoBlocks(main: Element, max: number, avoid: Element[]): Element[] {
  const cands = Array.from(
    main.querySelectorAll('section, form, [class*="rounded-2xl"], [class*="rounded-xl"]')
  ).filter((el) => {
    if (el.closest('header') || el.closest('[class*="fixed"]') || !isVisible(el)) return false;
    if (avoid.some((a) => a === el || a.contains(el) || el.contains(a))) return false;
    const r = el.getBoundingClientRect();
    return r.height >= 80 && r.width >= 240;
  });
  const blocks: Element[] = [];
  for (const el of cands) {
    if (blocks.some((b) => b.contains(el))) continue;
    if (cands.filter((c) => c !== el && el.contains(c)).length >= 2) continue;
    blocks.push(el);
    if (blocks.length === max) break;
  }
  return blocks;
}

function add(list: TourStep[], el: Element | null, id: string, title: string, description: string, side: Side) {
  if (!el || !isVisible(el)) return;
  el.setAttribute('data-rt', id);
  list.push({ element: '[data-rt="' + id + '"]', title, description, side });
}

/* ---------- Insights do Noah ---------- */
function insightsSteps(main: Element): TourStep[] {
  const s: TourStep[] = [];
  add(s, find(main, /^diagnostico prioritario$/, 'section'), 'ins-diag',
    'Diagn\u00f3stico priorit\u00e1rio',
    'Aqui est\u00e3o as a\u00e7\u00f5es mais urgentes para a sua loja. O Noah analisa seus n\u00fameros e destaca primeiro o que est\u00e1 travando suas vendas e as oportunidades r\u00e1pidas de ganho. Comece sempre por aqui.',
    'bottom');
  add(s, find(main, /^dicas para a sua loja$/, 'section'), 'ins-dicas',
    'Dicas para a sua loja',
    'Recomenda\u00e7\u00f5es pr\u00e1ticas do Noah pensadas para a \u00e9poca do ano e o perfil da sua loja. Escolha uma por vez, aplique e acompanhe o efeito nos seus n\u00fameros.',
    'top');
  return s;
}

/* ---------- Pedidos dos lojistas ---------- */
function pedidosSteps(main: Element): TourStep[] {
  const s: TourStep[] = [];
  const btn = find(main, /^sugerir ideia$/, 'self');
  add(s, btn, 'ped-sugerir',
    'Sugira uma ideia',
    'Tem algo que faria diferen\u00e7a na sua loja? Clique aqui, escolha o m\u00f3dulo e a categoria e descreva o seu pedido. Cada sugest\u00e3o ajuda o time a decidir o que ser\u00e1 desenvolvido primeiro.',
    'bottom');
  const list = autoBlocks(main, 1, btn ? [btn] : [])[0] ?? null;
  add(s, list, 'ped-lista',
    'Pedidos de outros lojistas',
    'Veja tudo o que outros lojistas j\u00e1 sugeriram, acompanhe o status de cada pedido e vote nas ideias que tamb\u00e9m fariam diferen\u00e7a para voc\u00ea. Quanto mais votos, maior a prioridade.',
    'top');
  return s;
}

/* ---------- Clube SLL ---------- */
function clubeSteps(main: Element): TourStep[] {
  const s: TourStep[] = [];
  const used: Element[] = [];
  const put = (el: Element | null, id: string, title: string, desc: string, side: Side) => {
    if (!el || used.includes(el)) return;
    used.push(el);
    add(s, el, id, title, desc, side);
  };
  const first = (rxs: RegExp[], kind: 'section' | 'card' | 'self'): Element | null => {
    for (const rx of rxs) {
      const el = find(main, rx, kind);
      if (el) return el;
    }
    return null;
  };

  put(first([/^ative o seu link de indicacao/, /^link bloqueado/, /^gerando seu link/, /^https?:\/\//], 'card'), 'cl-link',
    'Seu link de indica\u00e7\u00e3o',
    'Este \u00e9 o seu link exclusivo do Clube. Leia e aceite as regras para ativ\u00e1-lo, depois copie e compartilhe com outros lojistas. Cada loja que assinar por ele gera comiss\u00e3o recorrente todo m\u00eas.',
    'bottom');

  put(first([/^previsao 12 meses/], 'card'), 'cl-previsao',
    'Previs\u00e3o de 12 meses',
    'Estimativa do quanto voc\u00ea deve receber em comiss\u00f5es nos pr\u00f3ximos 12 meses, com base nas lojas que voc\u00ea j\u00e1 indicou.',
    'bottom');

  put(first([/^saldo a liberar/], 'card'), 'cl-liberar',
    'Saldo a liberar',
    'Comiss\u00f5es j\u00e1 geradas pelas lojas que voc\u00ea indicou, mas que ainda est\u00e3o dentro do prazo de libera\u00e7\u00e3o. Quando o prazo termina, o valor passa automaticamente para o saldo dispon\u00edvel.',
    'bottom');

  put(first([/^saldo disponivel/], 'card'), 'cl-saldo',
    'Saldo dispon\u00edvel',
    'Valor j\u00e1 liberado e pronto para saque. Com saldo dispon\u00edvel e acima do m\u00ednimo, voc\u00ea solicita o saque via PIX.',
    'bottom');

  put(first([/^lojas indicadas/], 'card'), 'cl-lojas',
    'Lojas indicadas',
    'Quantidade de lojas que j\u00e1 se cadastraram pelo seu link. Quanto mais lojas assinando, maior a sua comiss\u00e3o recorrente por m\u00eas.',
    'bottom');

  put(first([/^meus saques/], 'card'), 'cl-saques',
    'Meus saques',
    'Hist\u00f3rico dos saques que voc\u00ea pediu e o status de cada um. H\u00e1 um valor m\u00ednimo para sacar e os pagamentos saem em um dia fixo do m\u00eas, para a chave PIX informada.',
    'top');

  put(first([/^suas indicacoes/], 'card'), 'cl-ind',
    'Suas indica\u00e7\u00f5es',
    'Veja todas as lojas que voc\u00ea indicou e a situa\u00e7\u00e3o de cada uma: quem j\u00e1 se cadastrou e quem j\u00e1 assinou e est\u00e1 gerando comiss\u00e3o.',
    'top');

  put(first([/^seus ganhos/], 'card'), 'cl-ganhos',
    'Seus ganhos',
    'Acompanhe as comiss\u00f5es recebidas ao longo do tempo. Troque o per\u00edodo para ver o total ganho em cada intervalo.',
    'top');

  put(first([/^simule seus ganhos/], 'card'), 'cl-simule',
    'Simule seus ganhos',
    'Escolha o m\u00f3dulo indicado, o plano e quantas lojas pretende indicar para ver a estimativa de comiss\u00e3o por m\u00eas, em 12 meses e em 24 meses.',
    'top');

  put(first([/^suas metas/], 'card'), 'cl-metas',
    'Suas metas',
    'Acompanhe seu progresso no Clube. Ao bater cada meta voc\u00ea sobe de n\u00edvel e desbloqueia benef\u00edcios exclusivos.',
    'top');

  return s;
}
const CUSTOM: Record<string, (main: Element) => TourStep[]> = {
  '/dashboard/insights-noah': insightsSteps,
  '/dashboard/dicas': insightsSteps,
  '/dashboard/pedidos-dos-lojistas': pedidosSteps,
  '/dashboard/afiliados': clubeSteps,
};

export function buildRouteSteps(pathname: string): TourStep[] {
  const main = document.querySelector('main');
  if (!main) return [];
  main.querySelectorAll('[data-rt]').forEach((e) => e.removeAttribute('data-rt'));

  const custom = CUSTOM[clean(pathname)];
  if (custom) return custom(main);

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

  autoBlocks(main, 4, []).forEach((b, i) => {
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