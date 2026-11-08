import type { CSSProperties } from 'react';
import type { BlockType } from './types';
import { EXTRA_BLOCKS, type BlockDef } from './registry-extra';
import { ALIGN_OPTIONS, boxCss, boxFields, num, safeUrl, textCss, textFields } from './styleKit';

const align = (p: Record<string, string>, d: string) => (p.align || d) as CSSProperties['textAlign'];

export const BLOCKS = {
  ...(EXTRA_BLOCKS as Record<Exclude<BlockType, 'hero' | 'text' | 'image' | 'button'>, BlockDef>),
  hero: {
    label: 'Hero',
    defaults: { title: 'Título principal', subtitle: 'Subtítulo da sua oferta', cta: 'Comprar agora', href: '#', bg: '#111827', align: 'center' },
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'subtitle', label: 'Subtítulo', multiline: true },
      { key: 'cta', label: 'Texto do botão' },
      { key: 'href', label: 'Link do botão' },
      ...textFields('title', 'Título', 120),
      ...textFields('subtitle', 'Subtítulo', 80),
      ...textFields('cta', 'Botão', 40),
      ...boxFields('cta', 'Botão'),
      { key: 'bg', label: 'Cor de fundo', type: 'color', group: 'Seção' },
      { key: 'pad', label: 'Espaço vertical (px)', type: 'number', min: 0, max: 240, group: 'Seção' },
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Seção' },
    ],
    render: (p) => (
      <section style={{ background: p.bg, padding: `${num(p.pad, 64)}px 32px`, textAlign: align(p, 'center') }}>
        <h1 style={{ margin: 0, ...textCss(p, 'title', { size: 36, color: '#ffffff', style: 'bold' }) }}>{p.title}</h1>
        <p style={{ margin: '12px 0 0', whiteSpace: 'pre-line', ...textCss(p, 'subtitle', { size: 18, color: '#d1d5db', style: 'normal' }) }}>{p.subtitle}</p>
        <a
          href={safeUrl(p.href)}
          style={{
            display: 'inline-block', marginTop: 24, textDecoration: 'none',
            ...boxCss(p, 'cta', { bg: '#10b981', radius: 8, pad: 12, btn: true }),
            ...textCss(p, 'cta', { size: 16, color: '#ffffff', style: 'bold' }),
          }}
        >
          {p.cta}
        </a>
      </section>
    ),
  },
  text: {
    label: 'Texto',
    defaults: { content: 'Escreva seu texto aqui.', align: 'left' },
    fields: [
      { key: 'content', label: 'Conteúdo', multiline: true },
      ...textFields('text', 'Texto', 80),
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Seção' },
      { key: 'bg', label: 'Cor de fundo', type: 'color', group: 'Seção' },
      { key: 'pad', label: 'Espaço vertical (px)', type: 'number', min: 0, max: 200, group: 'Seção' },
    ],
    render: (p) => (
      <section
        style={{
          background: p.bg || undefined, padding: `${num(p.pad, 32)}px 32px`, textAlign: align(p, 'left'), whiteSpace: 'pre-line',
          ...textCss(p, 'text', { size: 16, color: '#1f2937', style: 'normal' }),
        }}
      >
        {p.content}
      </section>
    ),
  },
  image: {
    label: 'Imagem',
    defaults: { src: 'https://placehold.co/1200x500', alt: 'Imagem' },
    fields: [
      { key: 'src', label: 'URL da imagem' },
      { key: 'alt', label: 'Texto alternativo' },
      { key: 'radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Estilo' },
    ],
    render: (p) => <img src={safeUrl(p.src)} alt={p.alt} loading="lazy" style={{ width: '100%', display: 'block', borderRadius: num(p.radius, 0) }} />,
  },
  button: {
    label: 'Botão',
    defaults: { label: 'Clique aqui', href: '#', color: '#10b981', align: 'center' },
    fields: [
      { key: 'label', label: 'Texto' },
      { key: 'href', label: 'Link' },
      { key: 'color', label: 'Cor de fundo', type: 'color' },
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS },
      ...textFields('btn', 'Texto do botão', 40),
      ...boxFields('btn', 'Botão', false),
    ],
    render: (p) => (
      <section style={{ padding: '24px 32px', textAlign: align(p, 'center') }}>
        <a
          href={safeUrl(p.href)}
          style={{
            display: 'inline-block', textDecoration: 'none',
            ...boxCss(p, 'btn', { bg: p.color || '#10b981', radius: 8, pad: 12, btn: true }),
            ...textCss(p, 'btn', { size: 16, color: '#ffffff', style: 'bold' }),
          }}
        >
          {p.label}
        </a>
      </section>
    ),
  },
} as Record<BlockType, BlockDef>;

export const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];