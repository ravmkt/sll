export type ContrastLevel = 'ok' | 'warn' | 'bad';

export interface ContrastIssue {
  id: string;
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  level: ContrastLevel;
  suggested: '#FFFFFF' | '#111111';
}

function toRgb(hex: string): [number, number, number] | null {
  const h = String(hex || '').trim().replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(f)) return null;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number | null {
  const rgb = toRgb(hex);
  if (!rgb) return null;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function levelOf(ratio: number): ContrastLevel {
  if (ratio >= 4.5) return 'ok';
  if (ratio >= 3) return 'warn';
  return 'bad';
}

export function bestText(bg: string): '#FFFFFF' | '#111111' {
  const w = contrastRatio('#FFFFFF', bg) ?? 0;
  const k = contrastRatio('#111111', bg) ?? 0;
  return w >= k ? '#FFFFFF' : '#111111';
}

interface Pair {
  id: string;
  label: string;
  fgKey: string;
  fgFallbackKey?: string;
  fgDefault?: string;
  bgKey?: string;
  bgFallbackKey?: string;
  bgDefault?: string;
}

const PAIRS: Pair[] = [
  { id: 'title', label: 'T\u00edtulo sobre o v\u00eddeo', fgKey: 'titleColor', fgDefault: '#ffffff', bgKey: 'titleBgColor', bgDefault: '#000000' },
  { id: 'productName', label: 'Nome do produto (card branco)', fgKey: 'productNameColor', bgDefault: '#FFFFFF' },
  { id: 'productPrice', label: 'Pre\u00e7o do produto (card branco)', fgKey: 'productPriceColor', bgDefault: '#FFFFFF' },
  { id: 'prodCardName', label: 'Produto no Player: nome', fgKey: 'prodCardNameColor', fgDefault: '#111111', bgKey: 'prodCardBgColor', bgDefault: '#ffffff' },
  { id: 'prodCardPrice', label: 'Produto no Player: pre\u00e7o', fgKey: 'prodCardPriceColor', fgFallbackKey: 'borderColor', bgKey: 'prodCardBgColor', bgDefault: '#ffffff' },
  { id: 'prodCardBtn', label: 'Produto no Player: bot\u00e3o Comprar', fgKey: 'prodCardBtnTextColor', fgDefault: '#ffffff', bgKey: 'prodCardBtnBgColor', bgFallbackKey: 'borderColor', bgDefault: '#10b981' },
  { id: 'couponCode', label: 'Cupom: c\u00f3digo', fgKey: 'couponCodeColor', fgDefault: '#ffffff', bgKey: 'couponCodeBgColor', bgDefault: '#0094ea' },
  { id: 'couponText', label: 'Cupom: desconto', fgKey: 'couponTextColor', fgDefault: '#000000', bgKey: 'couponTextBgColor', bgDefault: '#ffffff' },
  { id: 'info', label: 'Card Informativo', fgKey: 'infoTextColor', fgDefault: '#ffffff', bgKey: 'infoBgColor', bgDefault: '#065f46' },
  { id: 'share', label: 'Card Compartilhar', fgKey: 'shareTextColor', fgDefault: '#000000', bgKey: 'shareBgColor', bgDefault: '#ffffff' },
];

function valid(cfg: Record<string, unknown>, key?: string): string | null {
  const v = key ? cfg[key] : undefined;
  return typeof v === 'string' && toRgb(v) ? v : null;
}

function pick(cfg: Record<string, unknown>, key?: string, fallbackKey?: string, fallback?: string): string | null {
  return valid(cfg, key) ?? valid(cfg, fallbackKey) ?? fallback ?? null;
}

export function checkAppearance(cfg: Record<string, unknown>): ContrastIssue[] {
  const out: ContrastIssue[] = [];
  for (const p of PAIRS) {
    const fg = pick(cfg, p.fgKey, p.fgFallbackKey, p.fgDefault);
    const bg = pick(cfg, p.bgKey, p.bgFallbackKey, p.bgDefault);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio === null) continue;
    const level = levelOf(ratio);
    if (level === 'ok') continue;
    out.push({ id: p.id, label: p.label, fg, bg, ratio, level, suggested: bestText(bg) });
  }
  return out;
}