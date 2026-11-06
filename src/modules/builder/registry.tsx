import type { BlockType } from './types';
import { EXTRA_BLOCKS, type BlockDef } from './registry-extra';


export const BLOCKS = {
  ...(EXTRA_BLOCKS as Record<Exclude<BlockType, 'hero' | 'text' | 'image' | 'button'>, BlockDef>),
  hero: {
    label: 'Hero',
    defaults: { title: 'Título principal', subtitle: 'Subtítulo da sua oferta', cta: 'Comprar agora', bg: '#111827' },
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'subtitle', label: 'Subtítulo', multiline: true },
      { key: 'cta', label: 'Texto do botão' },
      { key: 'bg', label: 'Cor de fundo' },
    ],
    render: (p) => (
      <section style={{ background: p.bg }} className="px-8 py-16 text-center text-white">
        <h1 className="text-4xl font-bold">{p.title}</h1>
        <p className="mt-3 text-lg opacity-80">{p.subtitle}</p>
        <span className="mt-6 inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold">{p.cta}</span>
      </section>
    ),
  },
  text: {
    label: 'Texto',
    defaults: { content: 'Escreva seu texto aqui.' },
    fields: [{ key: 'content', label: 'Conteúdo', multiline: true }],
    render: (p) => <section className="px-8 py-8 text-gray-800 whitespace-pre-line">{p.content}</section>,
  },
  image: {
    label: 'Imagem',
    defaults: { src: 'https://placehold.co/1200x500', alt: 'Imagem' },
    fields: [
      { key: 'src', label: 'URL da imagem' },
      { key: 'alt', label: 'Texto alternativo' },
    ],
    render: (p) => <img src={p.src} alt={p.alt} className="w-full" loading="lazy" />,
  },
  button: {
    label: 'Botão',
    defaults: { label: 'Clique aqui', href: '#', color: '#10b981' },
    fields: [
      { key: 'label', label: 'Texto' },
      { key: 'href', label: 'Link' },
      { key: 'color', label: 'Cor' },
    ],
    render: (p) => (
      <section className="px-8 py-6 text-center">
        <span style={{ background: p.color }} className="inline-block rounded-lg px-6 py-3 font-semibold text-white">
          {p.label}
        </span>
      </section>
    ),
  },
} as Record<BlockType, BlockDef>;

export const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];

