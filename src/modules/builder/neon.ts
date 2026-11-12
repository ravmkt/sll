import type { CSSProperties } from 'react';
import type { Field } from './registry-extra';

type P = Record<string, string>;

const n = (v: string | undefined, d: number) => {
  const x = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(x) ? x : d;
};

// Borda em degrade (cor 1 -> cor 2 -> cor 1) com brilho externo e interno.
// `fill` e a cor interna (precisa ser solida para a borda em degrade aparecer limpa).
export function neonStyle(p: P, fill = '#0b0a08'): CSSProperties {
  if (p.neon !== '1') return {};
  const c1 = p.neonC1 || '#facc15';
  const c2 = p.neonC2 || '#ffffff';
  const w = Math.min(Math.max(n(p.neonW, 2), 1), 12);
  const g = Math.min(Math.max(n(p.neonGlow, 14), 0), 60);
  const ang = n(p.neonAngle, 90);
  return {
    border: `${w}px solid transparent`,
    background: `linear-gradient(${fill}, ${fill}) padding-box, linear-gradient(${ang}deg, ${c1}, ${c2}, ${c1}) border-box`,
    boxShadow: `0 0 ${g / 2}px ${c1}, 0 0 ${g * 2}px ${c1}88, inset 0 0 ${g / 2}px ${c1}55`,
  };
}

export const neonFields = (group = 'Neon'): Field[] => [
  { key: 'neon', label: 'Efeito neon', type: 'select', group, def: '0', options: [{ value: '0', label: 'Desligado' }, { value: '1', label: 'Ligado' }] },
  { key: 'neonC1', label: 'Neon: cor 1 (ex: dourado)', type: 'color', group, def: '#facc15' },
  { key: 'neonC2', label: 'Neon: cor 2 (ex: branco)', type: 'color', group, def: '#ffffff' },
  { key: 'neonAngle', label: 'Neon: \u00e2ngulo (graus)', type: 'number', min: 0, max: 360, group, def: '90' },
  { key: 'neonW', label: 'Neon: espessura da borda (px)', type: 'number', min: 1, max: 12, group, def: '2' },
  { key: 'neonGlow', label: 'Neon: intensidade do brilho (px)', type: 'number', min: 0, max: 60, group, def: '14' },
];