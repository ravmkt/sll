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
  group?: string;
  bgType?: 'code' | 'image';
  images?: { feed: string; story: string };
  cutout?: boolean;
}

const img = (k: string) => ({
  feed: `/assets/templates/${k}-feed.webp`,
  story: `/assets/templates/${k}-story.webp`,
});

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
    group: 'Cl\u00e1ssicos',
    bgType: 'code',
    cutout: false,
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
    group: 'Cl\u00e1ssicos',
    bgType: 'code',
    cutout: true,
  },
  {
    key: 'editorial-pincel',
    label: 'Editorial Pincel',
    description: 'Fundo claro com pinceladas, t\u00edtulo em serifa elegante.',
    bgFrom: '#f3ece2', bgTo: '#e2d6c4', accent: '#b5532a',
    kicker: 'COLE\u00c7\u00c3O ESPECIAL', subtitle: 'COLE\u00c7\u00c3O ESPECIAL',
    group: 'Fundo de imagem', bgType: 'image', images: img('editorial-pincel'), cutout: true,
  },
  {
    key: 'vitrine-podio',
    label: 'Vitrine P\u00f3dio',
    description: 'Produto sobre p\u00f3dio, visual de vitrine premium.',
    bgFrom: '#111111', bgTo: '#2a2a2a', accent: '#b8860b',
    kicker: 'DESTAQUE DA SEMANA', subtitle: 'DESTAQUE DA SEMANA',
    group: 'Fundo de imagem', bgType: 'image', images: img('vitrine-podio'), cutout: true,
  },
  {
    key: 'palco-holofote',
    label: 'Palco Holofote',
    description: 'Palco escuro com holofotes e textos fortes.',
    bgFrom: '#050510', bgTo: '#1a1a3a', accent: '#ff3d71',
    kicker: 'SHOW DE OFERTAS', subtitle: 'SHOW DE OFERTAS',
    group: 'Fundo de imagem', bgType: 'image', images: img('palco-holofote'), cutout: true,
  },
  {
    key: 'holofote-minimal',
    label: 'Holofote Minimal',
    description: 'Fundo escuro limpo com foco de luz no produto.',
    bgFrom: '#0b0b0b', bgTo: '#1c1c1c', accent: '#4fc3f7',
    kicker: 'OFERTA ESPECIAL', subtitle: 'OFERTA ESPECIAL',
    group: 'Fundo de imagem', bgType: 'image', images: img('holofote-minimal'), cutout: true,
  },
  {
    key: 'novidade-diagonal',
    label: 'Novidade Diagonal',
    description: 'Composi\u00e7\u00e3o diagonal com chamada manuscrita para lan\u00e7amentos.',
    bgFrom: '#ffffff', bgTo: '#e8eef5', accent: '#0094eb',
    kicker: 'Novidade', subtitle: 'Novidade',
    group: 'Fundo de imagem', bgType: 'image', images: img('novidade-diagonal'), cutout: true,
  },
  {
    key: 'estudio-sombra',
    label: 'Est\u00fadio Sombra',
    description: 'Fundo bege com luz diagonal e sombra de folhas, gerado em c\u00f3digo.',
    bgFrom: '#f4efe8', bgTo: '#e3d9ca', accent: '#8a5a3c',
    kicker: 'Sele\u00e7\u00e3o do est\u00fadio', subtitle: 'Sele\u00e7\u00e3o do est\u00fadio',
    group: 'Fundo em c\u00f3digo', bgType: 'code', cutout: true,
  },
  {
    key: 'pop-colorido',
    label: 'Pop Colorido',
    description: 'Degrad\u00ea vibrante com c\u00edrculos e chamada manuscrita.',
    bgFrom: '#ff4e50', bgTo: '#f9d423', accent: '#ffffff',
    kicker: 'Ofertas de ver\u00e3o', subtitle: 'Ofertas de ver\u00e3o',
    group: 'Fundo em c\u00f3digo', bgType: 'code', cutout: true,
  },
  {
    key: 'minimal-claro',
    label: 'Minimal Claro',
    description: 'Fundo liso claro, tipografia limpa e muito respiro.',
    bgFrom: '#f5f5f5', bgTo: '#f5f5f5', accent: '#111111',
    kicker: 'OFERTA', subtitle: 'OFERTA',
    group: 'Fundo em c\u00f3digo', bgType: 'code', cutout: true,
  },
];

export const templateByKey = (k: string) => TEMPLATES.find((t) => t.key === k) ?? TEMPLATES[0];

export function styleForChannel(base: Omit<ArtStyle, 'w' | 'h'>, channelKey: string): ArtStyle {
  const c = channelByKey(channelKey);
  return { ...base, w: c?.w ?? 1080, h: c?.h ?? 1350 };
}