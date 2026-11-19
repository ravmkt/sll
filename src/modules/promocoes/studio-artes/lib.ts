export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const promoFromPct = (price: number, pct: number) => round2(price * (1 - pct / 100));
export const pctFromPromo = (price: number, promo: number) =>
  price > 0 ? round2((1 - promo / price) * 100) : 0;

export const FORMATS = {
  feed: { label: 'Feed / Grupo WhatsApp (1080×1350)', w: 1080, h: 1350 },
  story: { label: 'Stories / Status / Reels (1080×1920)', w: 1080, h: 1920 },
  square: { label: 'Quadrado (1080×1080)', w: 1080, h: 1080 },
} as const;
export type FormatKey = keyof typeof FORMATS;

export const VARIABLES = [
  'produto', 'preco_de', 'preco_por', 'desconto',
  'campanha', 'data_fim', 'site', 'whatsapp', 'link_produto',
] as const;

export const DEFAULT_MESSAGE = `*⚠️ {{campanha}} OFICIALMENTE COMEÇOU! ⚠️*

🚨 {{produto}} de {{preco_de}} por {{preco_por}} 🚨

🔥 Acesse nossos canais e aproveite:
🛍️ Site: {{site}}
📲 WhatsApp: {{whatsapp}}`;

export function renderMessage(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? '');
}

export function cleanSite(url: string | null | undefined) {
  return (url || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

export function waLink(phone: string | null | undefined) {
  let d = (phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}`;
}

export function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
