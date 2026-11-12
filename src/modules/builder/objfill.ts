import type { CSSProperties } from 'react';
import type { Field } from './registry-extra';
import { ALIGN_OPTIONS, num } from './styleKit';

type P = Record<string, string>;

const KINDS = [
  { value: 'color', label: 'Cor s\u00f3lida' },
  { value: 'gradient', label: 'Degrad\u00ea' },
  { value: 'transparent', label: 'Transparente' },
];

const kindOf = (p: P, k: string, d: string): string => p[`${k}Kind`] || (p[k] ? 'color' : d);

// Campos de fundo do OBJETO (selo, caixa, card). Os campos mudam conforme o tipo.
export const objFillFields = (k: string, group: string, defKind: string, defColor: string): Field[] => [
  { key: `${k}Kind`, label: 'Tipo de fundo', type: 'select', options: KINDS, group, def: (p) => kindOf(p, k, defKind) },
  { key: k, label: 'Cor (ou cor 1 do degrad\u00ea)', type: 'color', group, def: defColor, showIf: (p) => kindOf(p, k, defKind) !== 'transparent' },
  { key: `${k}2`, label: 'Degrad\u00ea: cor 2', type: 'color', group, def: '#000000', showIf: (p) => kindOf(p, k, defKind) === 'gradient' },
  { key: `${k}Ang`, label: 'Degrad\u00ea: \u00e2ngulo (graus)', type: 'number', min: 0, max: 360, group, def: '135', showIf: (p) => kindOf(p, k, defKind) === 'gradient' },
];

export function objFillCss(p: P, k: string, defKind: string, defColor: string): CSSProperties {
  const kind = kindOf(p, k, defKind);
  if (kind === 'transparent') return { background: 'transparent' };
  const c1 = p[k] || defColor;
  if (kind === 'gradient') {
    return { background: `linear-gradient(${num(p[`${k}Ang`], 135)}deg, ${c1}, ${p[`${k}2`] || '#000000'})` };
  }
  return { background: c1 };
}

// Faixa (secao) que envolve o objeto: SEMPRE transparente.
export const secPlain = (p: P, d: number): CSSProperties => ({
  ...({ containerType: 'inline-size' } as CSSProperties),
  background: 'transparent',
  padding: `${num(p.pad, d)}px 24px`,
  textAlign: (p.align || 'center') as CSSProperties['textAlign'],
});

export const secPlainFields = (pad: string): Field[] => [
  { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: 'Se\u00e7\u00e3o', def: pad },
  { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Se\u00e7\u00e3o', def: 'center' },
];