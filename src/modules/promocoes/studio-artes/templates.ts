import { channelByKey } from './lib';
import type { ArtStyle } from './renderArt';

export interface ArtTemplate {
  key: string;
  label: string;
  description: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
  kicker: string;
  subtitle: string;
}

export const TEMPLATES: ArtTemplate[] = [
  {
    key: 'classico',
    label: 'Cl\u00e1ssico',
    description: 'Fundo degrad\u00ea, produto centralizado e pre\u00e7o em destaque.',
    bgFrom: '#1a1a1a',
    bgTo: '#3b2418',
    accent: '#c0392b',
    kicker: '',
    subtitle: 'A maior promo\u00e7\u00e3o do ano j\u00e1 come\u00e7ou!',
  },
  {
    key: 'blackfriday',
    label: 'Black Friday Laranja',
    description: 'Bloco laranja, produto recortado \u00e0 esquerda, textos fortes \u00e0 direita e selo Compre agora.',
    bgFrom: '#000000',
    bgTo: '#000000',
    accent: '#ffa500',
    kicker: 'A MAIOR E MELHOR',
    subtitle: 'A MAIOR E MELHOR',
  },
];

export const templateByKey = (k: string) => TEMPLATES.find((t) => t.key === k) ?? TEMPLATES[0];

export function styleForChannel(base: Omit<ArtStyle, 'w' | 'h'>, channelKey: string): ArtStyle {
  const c = channelByKey(channelKey);
  return { ...base, w: c?.w ?? 1080, h: c?.h ?? 1350 };
}