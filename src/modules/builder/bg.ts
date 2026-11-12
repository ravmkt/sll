import type { CSSProperties } from 'react';
import type { Field } from './registry-extra';
import { safeUrl } from './styleKit';

type P = Record<string, string>;

export const BG_TYPES = [
  { value: 'color', label: 'Cor s\u00f3lida' },
  { value: 'gradient', label: 'Degrad\u00ea' },
  { value: 'image', label: 'Imagem' },
  { value: 'transparent', label: 'Transparente' },
];
const BG_SIZES = [
  { value: 'cover', label: 'Cobrir (recorta)' },
  { value: 'contain', label: 'Conter (inteira)' },
  { value: 'auto', label: 'Tamanho original' },
];
const BG_POS = [
  { value: 'center', label: 'Centro' },
  { value: 'top', label: 'Topo' },
  { value: 'bottom', label: 'Base' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
];

const esc = (u: string) => u.replace(/["'()\s\\]/g, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));

export function bgStyle(p: P): CSSProperties {
  const type = p.bgType || 'color';
  const color = p.bg || undefined;
  if (type === 'transparent') return { background: 'transparent' };

  if (type === 'gradient') {
    const a = Number(p.bgAngle);
    const ang = Number.isFinite(a) && p.bgAngle !== '' && p.bgAngle != null ? a : 135;
    return { background: `linear-gradient(${ang}deg, ${p.bg || '#111827'}, ${p.bg2 || '#000000'})` };
  }

  if (type === 'image' && p.bgImg) {
    const o = Math.min(Math.max(Number(p.bgOverlay) || 0, 0), 90) / 100;
    const url = `url("${esc(safeUrl(p.bgImg))}")`;
    const img = o > 0 ? `linear-gradient(rgba(0,0,0,${o}),rgba(0,0,0,${o})), ${url}` : url;
    return {
      backgroundColor: color,
      backgroundImage: img,
      backgroundSize: p.bgSize || 'cover',
      backgroundPosition: p.bgPos || 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  return { background: color };
}

const only = (...t: string[]) => (p: P) => t.includes(p.bgType || 'color');

export const bgFields = (group = 'Fundo'): Field[] => [
  { key: 'bgType', label: 'Tipo de fundo', type: 'select', options: BG_TYPES, group, def: 'color' },
  { key: 'bg', label: 'Cor (ou cor 1 do degrad\u00ea)', type: 'color', group, showIf: only('color', 'gradient') },
  { key: 'bg2', label: 'Degrad\u00ea: cor 2', type: 'color', group, def: '#000000', showIf: only('gradient') },
  { key: 'bgAngle', label: 'Degrad\u00ea: \u00e2ngulo (graus)', type: 'number', min: 0, max: 360, group, def: '135', showIf: only('gradient') },
  { key: 'bgImg', label: 'Imagem de fundo', type: 'upload', accept: 'image', group, showIf: only('image') },
  { key: 'bgOverlay', label: 'Imagem: pel\u00edcula escura (%)', type: 'number', min: 0, max: 90, group, def: '0', showIf: only('image') },
  { key: 'bgSize', label: 'Imagem: ajuste', type: 'select', options: BG_SIZES, group, def: 'cover', showIf: only('image') },
  { key: 'bgPos', label: 'Imagem: posi\u00e7\u00e3o', type: 'select', options: BG_POS, group, def: 'center', showIf: only('image') },
];

export const glowStyle = (p: P): CSSProperties => {
  if (!p.glow) return {};
  const n = Math.min(Math.max(Number(p.glowSize) || 14, 2), 60);
  return { boxShadow: `0 0 ${n / 2}px ${p.glow}, 0 0 ${n * 2}px ${p.glow}` };
};

export const glowFields = (group = 'Brilho'): Field[] => [
  { key: 'glow', label: 'Brilho: cor (vazio = sem brilho)', type: 'color', group },
  { key: 'glowSize', label: 'Brilho: intensidade (px)', type: 'number', min: 2, max: 60, group, def: '14' },
];

export const colTpl = (ratio: string | undefined, n: number): string => {
  const w = (ratio || '').split(/[,:/\s]+/).map(Number).filter((x) => Number.isFinite(x) && x > 0);
  return w.length === n ? w.map((x) => `minmax(0,${x}fr)`).join(' ') : `repeat(${n},minmax(0,1fr))`;
};

export const styleToCss = (s: CSSProperties): string =>
  Object.entries(s)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + ':' + String(v))
    .join(';');

const FILL_TYPES = [
  { value: 'color', label: 'Cor s\u00f3lida' },
  { value: 'gradient', label: 'Degrad\u00ea' },
  { value: 'transparent', label: 'Transparente' },
];

export const fillFields = (k: string, group: string, def: string, label = 'Fundo'): Field[] => {
  const ty = (p: P) => p[`${k}Type`] || 'color';
  return [
    { key: `${k}Type`, label: `${label}: tipo`, type: 'select', options: FILL_TYPES, group, def: 'color' },
    { key: k, label: `${label}: cor (ou cor 1 do degrad\u00ea)`, type: 'color', group, def, showIf: (p) => ty(p) === 'color' || ty(p) === 'gradient' },
    { key: `${k}2`, label: `${label}: degrad\u00ea cor 2`, type: 'color', group, def: '#000000', showIf: (p) => ty(p) === 'gradient' },
    { key: `${k}Angle`, label: `${label}: degrad\u00ea \u00e2ngulo (graus)`, type: 'number', min: 0, max: 360, group, def: '135', showIf: (p) => ty(p) === 'gradient' },
  ];
};

export const fillStyle = (p: P, k: string, def: string): string => {
  const ty = p[`${k}Type`] || 'color';
  if (ty === 'transparent') return 'transparent';
  const c1 = p[k] || def;
  if (ty === 'gradient') {
    const a = Number(p[`${k}Angle`]);
    const ang = p[`${k}Angle`] && Number.isFinite(a) ? a : 135;
    return `linear-gradient(${ang}deg, ${c1}, ${p[`${k}2`] || '#000000'})`;
  }
  return c1;
};
