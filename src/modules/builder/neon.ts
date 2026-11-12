import type { CSSProperties } from 'react';
import type { Field } from './registry-extra';

type P = Record<string, string>;

const n = (v: string | undefined, d: number) => {
  const x = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(x) ? x : d;
};
const HEX6 = /^#[0-9a-f]{6}$/i;

// Borda em degrade feita por pseudo-elemento com mascara: o interior continua transparente.
export const NEON_CSS =
  '.sll-neon::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:var(--nw,2px);background:linear-gradient(var(--na,90deg),var(--n1),var(--n2),var(--n1));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}';

export const neonClass = (p: P): string => (p.neon === '1' ? ' sll-neon' : '');

export function neonVars(p: P): CSSProperties {
  if (p.neon !== '1') return {};
  const c1 = p.neonC1 || '#facc15';
  const c2 = p.neonC2 || '#ffffff';
  const w = Math.min(Math.max(n(p.neonW, 2), 1), 12);
  const g = Math.min(Math.max(n(p.neonGlow, 14), 0), 60);
  const ang = n(p.neonAngle, 90);
  const soft = HEX6.test(c1) ? c1 + '88' : c1;
  const inn = HEX6.test(c1) ? c1 + '55' : c1;
  return {
    '--n1': c1,
    '--n2': c2,
    '--na': ang + 'deg',
    '--nw': w + 'px',
    boxShadow: `0 0 ${g / 2}px ${c1}, 0 0 ${g * 2}px ${soft}, inset 0 0 ${g / 2}px ${inn}`,
  } as unknown as CSSProperties;
}

const on = (p: P) => p.neon === '1';

export const neonFields = (group = 'Neon'): Field[] => [
  { key: 'neon', label: 'Efeito neon', type: 'select', group, def: '0', options: [{ value: '0', label: 'Desligado' }, { value: '1', label: 'Ligado' }] },
  { key: 'neonC1', label: 'Neon: cor 1 (ex: dourado)', type: 'color', group, def: '#facc15', showIf: on },
  { key: 'neonC2', label: 'Neon: cor 2 (ex: branco)', type: 'color', group, def: '#ffffff', showIf: on },
  { key: 'neonAngle', label: 'Neon: \u00e2ngulo (graus)', type: 'number', min: 0, max: 360, group, def: '90', showIf: on },
  { key: 'neonW', label: 'Neon: espessura da borda (px)', type: 'number', min: 1, max: 12, group, def: '2', showIf: on },
  { key: 'neonGlow', label: 'Neon: intensidade do brilho (px)', type: 'number', min: 0, max: 60, group, def: '14', showIf: on },
];