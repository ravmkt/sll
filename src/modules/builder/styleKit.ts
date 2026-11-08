import type { CSSProperties } from 'react';
import type { Field } from './registry-extra';

export const STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Negrito' },
  { value: 'italic', label: 'Itálico' },
  { value: 'bolditalic', label: 'Negrito itálico' },
];

export const FONT_OPTIONS = [
  { value: '', label: 'Padrão' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: "Georgia, 'Times New Roman', serif", label: 'Georgia' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
  { value: "'Courier New', monospace", label: 'Courier' },
];

export const SHADOW_OPTIONS = [
  { value: '', label: 'Padrão' },
  { value: 'none', label: 'Sem sombra' },
  { value: '0 1px 3px rgba(0,0,0,.12)', label: 'Suave' },
  { value: '0 4px 12px rgba(0,0,0,.15)', label: 'Média' },
  { value: '0 10px 30px rgba(0,0,0,.25)', label: 'Forte' },
];

export const ALIGN_OPTIONS = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centro' },
  { value: 'right', label: 'Direita' },
];

export function safeUrl(s = ''): string {
  const t = s.trim();
  if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(t)) return t;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#:].*)?$/i.test(t)) return `https://${t}`;
  return '#';
}

export function parseItems(v?: string): Record<string, string>[] {
  if (!v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a.filter((x) => x && typeof x === 'object') : [];
  } catch {
    return [];
  }
}

export function num(v: string | undefined, d: number): number {
  if (v === undefined || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

type Def = Field['def'];
type TextDef = { size?: Def; color?: Def; style?: Def };
type BoxDef = { bg?: Def; pad?: Def; bw?: Def; bc?: Def; radius?: Def; shadow?: Def };

export function fieldValue(f: Field, p: Record<string, string>): string {
  const v = p[f.key];
  if (v !== undefined && v !== '') return v;
  return typeof f.def === 'function' ? f.def(p) : (f.def ?? '');
}

export function textFields(k: string, label: string, max = 80, d: TextDef = {}): Field[] {
  return [
    { key: `${k}Size`, label: `${label}: tamanho (px)`, type: 'number', min: 8, max, group: label, def: d.size },
    { key: `${k}Color`, label: `${label}: cor`, type: 'color', group: label, def: d.color },
    { key: `${k}Style`, label: `${label}: estilo`, type: 'select', options: STYLE_OPTIONS, group: label, def: d.style },
    { key: `${k}Font`, label: `${label}: fonte`, type: 'select', options: FONT_OPTIONS, group: label },
  ];
}

export function boxFields(k: string, label: string, withBg = true, d: BoxDef = {}): Field[] {
  const f: Field[] = [];
  if (withBg) f.push({ key: `${k}Bg`, label: `${label}: cor de fundo`, type: 'color', group: label, def: d.bg });
  f.push(
    { key: `${k}Pad`, label: `${label}: espaço interno (px)`, type: 'number', min: 0, max: 120, group: label, def: d.pad },
    { key: `${k}Bw`, label: `${label}: borda (px)`, type: 'number', min: 0, max: 20, group: label, def: d.bw },
    { key: `${k}Bc`, label: `${label}: cor da borda`, type: 'color', group: label, def: d.bc ?? '#e5e7eb' },
    { key: `${k}Radius`, label: `${label}: arredondamento (px)`, type: 'number', min: 0, max: 60, group: label, def: d.radius },
    { key: `${k}Shadow`, label: `${label}: sombra`, type: 'select', options: SHADOW_OPTIONS, group: label, def: d.shadow },
  );
  return f;
}

export function productDescription(p: unknown): string {
  const o = (p ?? {}) as Record<string, unknown>;
  const raw = [o.description, o.shortDescription, o.short_description, o.desc, o.summary].find(
    (v) => typeof v === 'string' && v.trim(),
  ) as string | undefined;
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 600);
}
export function textCss(
  p: Record<string, string>,
  k: string,
  d: { size: number; color: string; style: string },
): CSSProperties {
  const s = p[`${k}Style`] || d.style;
  return {
    fontSize: num(p[`${k}Size`], d.size),
    color: p[`${k}Color`] || d.color,
    fontWeight: s === 'bold' || s === 'bolditalic' ? 700 : 400,
    fontStyle: s === 'italic' || s === 'bolditalic' ? 'italic' : 'normal',
    fontFamily: p[`${k}Font`] || undefined,
  };
}

export function boxCss(
  p: Record<string, string>,
  k: string,
  d: { bg?: string; bw?: number; bc?: string; radius?: number; pad?: number; shadow?: string; btn?: boolean } = {},
): CSSProperties {
  const bw = num(p[`${k}Bw`], d.bw ?? 0);
  const pad = num(p[`${k}Pad`], d.pad ?? 0);
  const sh = p[`${k}Shadow`] || d.shadow || '';
  return {
    background: p[`${k}Bg`] || d.bg || undefined,
    padding: d.btn ? `${pad}px ${pad * 2}px` : `${pad}px`,
    border: bw > 0 ? `${bw}px solid ${p[`${k}Bc`] || d.bc || '#e5e7eb'}` : 'none',
    borderRadius: num(p[`${k}Radius`], d.radius ?? 0),
    boxShadow: sh || undefined,
  };
}