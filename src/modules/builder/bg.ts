import type { CSSProperties } from 'react';
import type { Field } from './registry-extra';
import { safeUrl } from './styleKit';

type P = Record<string, string>;

export const BG_TYPES = [
  { value: 'color', label: 'Cor s\u00f3lida' },
  { value: 'gradient', label: 'Degrad\u00ea' },
  { value: 'image', label: 'Imagem' },
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

export const bgFields = (group = 'Fundo'): Field[] => [
  { key: 'bgType', label: 'Tipo de fundo', type: 'select', options: BG_TYPES, group, def: 'color' },
  { key: 'bg', label: 'Cor (ou cor 1 do degrad\u00ea)', type: 'color', group },
  { key: 'bg2', label: 'Degrad\u00ea: cor 2', type: 'color', group, def: '#000000' },
  { key: 'bgAngle', label: 'Degrad\u00ea: \u00e2ngulo (graus)', type: 'number', min: 0, max: 360, group, def: '135' },
  { key: 'bgImg', label: 'Imagem de fundo', type: 'upload', accept: 'image', group },
  { key: 'bgOverlay', label: 'Imagem: pel\u00edcula escura (%)', type: 'number', min: 0, max: 90, group, def: '0' },
  { key: 'bgSize', label: 'Imagem: ajuste', type: 'select', options: BG_SIZES, group, def: 'cover' },
  { key: 'bgPos', label: 'Imagem: posi\u00e7\u00e3o', type: 'select', options: BG_POS, group, def: 'center' },
];