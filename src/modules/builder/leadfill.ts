import type { CSSProperties } from 'react';
import type { Field } from './registry-extra';

type P = Record<string, string>;

const ty = (p: P) => p.cfType || 'color';
const only = (...a: string[]) => (p: P) => a.includes(ty(p));

export const cardFillFields = (group = 'Fundo do card'): Field[] => [
  {
    key: 'cfType', label: 'Tipo de fundo do card', type: 'select', group, def: 'color',
    options: [
      { value: 'color', label: 'Cor s\u00f3lida' },
      { value: 'gradient', label: 'Degrad\u00ea' },
      { value: 'transparent', label: 'Transparente' },
    ],
  },
  { key: 'cardBg', label: 'Cor (ou cor 1 do degrad\u00ea)', type: 'color', group, def: '#14110d', showIf: only('color', 'gradient') },
  { key: 'cfC2', label: 'Degrad\u00ea: cor 2', type: 'color', group, def: '#000000', showIf: only('gradient') },
  { key: 'cfAngle', label: 'Degrad\u00ea: \u00e2ngulo (graus)', type: 'number', min: 0, max: 360, group, def: '135', showIf: only('gradient') },
];

export function cardFillStyle(p: P): CSSProperties {
  const t = ty(p);
  if (t === 'transparent') return { background: 'transparent' };
  const c1 = p.cardBg || '#14110d';
  if (t === 'gradient') {
    const a = Number(p.cfAngle);
    const ang = p.cfAngle !== undefined && p.cfAngle !== '' && Number.isFinite(a) ? a : 135;
    return { background: `linear-gradient(${ang}deg, ${c1}, ${p.cfC2 || '#000000'})` };
  }
  return { background: c1 };
}