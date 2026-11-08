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
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(t) ? t : '#';
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

export function textFields(k: string, label: string, max = 80): Field[] {
  return [
    { key: `${k}Size`, label: `${label}: tamanho (px)`, type: 'number', min: 8, max, group: label },
    { key: `${k}Color`, label: `${label}: cor`, type: 'color', group: label },
    { key: `${k}Style`, label: `${label}: estilo`, type: 'select', options: STYLE_OPTIONS, group: label },
    { key: `${k}Font`, label: `${label}: fonte`, type: 'select', options: FONT_OPTIONS, group: label },
  ];
}

export function boxFields(k: string, label: string, withBg = true): Field[] {
  const f: Field[] = [];
  if (withBg) f.push({ key: `${k}Bg`, label: `${label}: cor de fundo`, type: 'color', group: label });
  f.push(
    { key: `${k}Pad`, label: `${label}: espaço interno (px)`, type: 'number', min: 0, max: 120, group: label },
    { key: `${k}Bw`, label: `${label}: borda (px)`, type: 'number', min: 0, max: 20, group: label },
    { key: `${k}Bc`, label: `${label}: cor da borda`, type: 'color', group: label },
    { key: `${k}Radius`, label: `${label}: arredondamento (px)`, type: 'number', min: 0, max: 60, group: label },
    { key: `${k}Shadow`, label: `${label}: sombra`, type: 'select', options: SHADOW_OPTIONS, group: label },
  );
  return f;
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