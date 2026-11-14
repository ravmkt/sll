import type { BenefitItem, BenefitsDesign, IconSettings } from '../types/infoCards';

export interface IconDef { name: string; label: string; svg: string }
export interface IconGroup { id: string; label: string; icons: IconDef[] }

const I = (name: string, label: string, svg: string): IconDef => ({ name, label, svg });

export const ICON_GROUPS: IconGroup[] = [
  { id: 'entrega', label: 'Entrega', icons: [
    I('truck', 'Frete / Entrega', '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'),
    I('package', 'Pacote', '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
    I('map-pin', 'Local / Retirada', '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    I('clock', 'Prazo / Rápido', '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    I('zap', 'Envio imediato', '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
    I('globe', 'Envio para todo país', '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
  ] },
  { id: 'pagamento', label: 'Pagamento', icons: [
    I('credit-card', 'Cartão / Parcelamento', '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'),
    I('pix', 'Pix', '<path d="M12 2 22 12 12 22 2 12Z"/><path d="M8.5 12 12 8.5 15.5 12 12 15.5Z"/>'),
    I('banknote', 'Dinheiro', '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>'),
    I('wallet', 'Carteira', '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>'),
    I('percent', 'Desconto', '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
    I('tag', 'Oferta / Preço', '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>'),
  ] },
  { id: 'seguranca', label: 'Segurança', icons: [
    I('shield-check', 'Compra segura', '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    I('lock', 'Dados protegidos', '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    I('badge-check', 'Verificado', '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>'),
    I('check-circle', 'Garantia', '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  ] },
  { id: 'trocas', label: 'Trocas e devoluções', icons: [
    I('rotate-ccw', 'Troca fácil', '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    I('undo', 'Devolução', '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'),
    I('calendar', 'Prazo de troca', '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  ] },
  { id: 'qualidade', label: 'Qualidade e marca', icons: [
    I('star', 'Avaliação', '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    I('award', 'Premiado', '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>'),
    I('heart', 'Favorito', '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
    I('thumbs-up', 'Aprovado', '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>'),
    I('gift', 'Brinde', '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>'),
    I('smile', 'Clientes felizes', '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>'),
    I('shopping-bag', 'Sacola', '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
    I('shopping-cart', 'Carrinho', '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'),
  ] },
  { id: 'suporte', label: 'Atendimento', icons: [
    I('message-circle', 'WhatsApp / Chat', '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
    I('headphones', 'Suporte', '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>'),
    I('phone', 'Telefone', '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    I('mail', 'E-mail', '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
  ] },
];

export const ICON_MAP: Record<string, IconDef> = Object.fromEntries(
  ICON_GROUPS.flatMap((g) => g.icons).map((i) => [i.name, i]),
);

const TAGS = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g']);
const ATTRS = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height',
  'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform', 'opacity']);

/** Aceita markup SVG (com ou sem <svg>) e devolve só as formas permitidas. Vazio = inválido. */
export function sanitizeSvg(raw: string): string {
  if (!raw || raw.length > 20000) return '';
  const inner = raw.replace(/<\?xml[^>]*>/gi, '').replace(/<\/?svg[^>]*>/gi, '');
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return '';
  const walk = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    if (!TAGS.has(tag)) return '';
    let attrs = '';
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase();
      if (!ATTRS.has(n) || /url\(|javascript|expression/i.test(a.value)) continue;
      attrs += ` ${n}="${a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`;
    }
    return `<${tag}${attrs}>${Array.from(el.children).map(walk).join('')}</${tag}>`;
  };
  return Array.from(doc.documentElement.children).map(walk).join('');
}

export const DEFAULT_DESIGN: BenefitsDesign = {
  bg: '#F8FAFC', text: '#0F172A', sub: '#64748B', border: '#E2E8F0', radius: 12,
  divider: true, item_card: false, mobile: 'carousel',
};

export const DEFAULT_ICON: IconSettings = { position: 'left', size: 28, color: '#0094EB', bg: 'circle', bg_color: '#E0F2FE' };

const mk = (icon: string, label: string, value: string): BenefitItem =>
  ({ label, value, icon, icon_svg: ICON_MAP[icon]?.svg ?? '', link: '' });

const SAMPLE: BenefitItem[] = [
  mk('truck', 'Frete grátis', 'acima de R$ 199'),
  mk('credit-card', 'Parcele em 12x', 'sem juros'),
  mk('shield-check', 'Compra segura', 'dados protegidos'),
  mk('rotate-ccw', 'Troca fácil', 'em até 30 dias'),
];

export interface BenefitTemplate {
  id: string; name: string; description: string;
  icon: IconSettings; design: BenefitsDesign; items: BenefitItem[];
}

export const BENEFIT_TEMPLATES: BenefitTemplate[] = [
  { id: 'clean', name: 'Faixa clara', description: 'Ícone à esquerda, divisores',
    icon: { position: 'left', size: 26, color: '#0094EB', bg: 'circle', bg_color: '#E0F2FE' },
    design: { ...DEFAULT_DESIGN }, items: SAMPLE },
  { id: 'dark', name: 'Faixa escura', description: 'Ícone no topo, centralizado',
    icon: { position: 'top', size: 30, color: '#FFFFFF', bg: 'none', bg_color: '#E0F2FE' },
    design: { bg: '#0F172A', text: '#FFFFFF', sub: '#CBD5E1', border: '#1E293B', radius: 0, divider: true, item_card: false, mobile: 'carousel' },
    items: SAMPLE },
  { id: 'cards', name: 'Cards separados', description: 'Ícone à direita, um card por benefício',
    icon: { position: 'right', size: 24, color: '#0094EB', bg: 'square', bg_color: '#E0F2FE' },
    design: { bg: '#FFFFFF', text: '#0F172A', sub: '#64748B', border: '#E2E8F0', radius: 14, divider: false, item_card: true, mobile: 'carousel' },
    items: SAMPLE },
];
