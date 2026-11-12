import type { CSSProperties } from 'react';

type P = Record<string, string>;

// Retorna o estilo de fundo do bloco. Sem bgType, mantém o comportamento antigo (cor em `bg`).
export function bgStyle(p: P): CSSProperties {
  const type = p.bgType || 'color';
  const color = p.bg || undefined;

  if (type === 'gradient') {
    const a = p.bgAngle || '135';
    const c1 = p.bg || '#111827';
    const c2 = p.bg2 || '#000000';
    return { background: `linear-gradient(${a}deg, ${c1}, ${c2})` };
  }

  if (type === 'image' && p.bgImg) {
    const o = Math.min(Math.max(Number(p.bgOverlay) || 0, 0), 100) / 100;
    const url = `url("${p.bgImg}")`;
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

export const BG_TYPES = [
  { value: 'color', label: 'Cor sólida' },
  { value: 'gradient', label: 'Degradê' },
  { value: 'image', label: 'Imagem' },
];