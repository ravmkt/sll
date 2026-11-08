import type { ReactElement, ReactNode } from 'react';
import type { BlockType } from './types';

export interface Field { key: string; label: string; multiline?: boolean; type?: 'text' | 'color' | 'number' | 'select' | 'datetime'; options?: { value: string; label: string }[]; min?: number; max?: number }
export interface BlockDef {
  label: string;
  defaults: Record<string, string>;
  fields: Field[];
  render: (p: Record<string, string>, kids?: ReactNode[]) => ReactElement;
}

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : url;
}

const STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Negrito' },
  { value: 'italic', label: 'Itálico' },
  { value: 'bolditalic', label: 'Negrito itálico' },
];

export const EXTRA_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
  columns: {
    label: 'Colunas',
    defaults: { cols: '2', gap: '16', pad: '24', align: 'stretch', stack: '1', bg: '' },
    fields: [
      { key: 'cols', label: 'Número de colunas' },
      { key: 'gap', label: 'Espaço entre colunas (px)', type: 'number', min: 0, max: 80 },
      { key: 'pad', label: 'Espaço interno (px)', type: 'number', min: 0, max: 120 },
      { key: 'align', label: 'Alinhamento vertical', type: 'select', options: [
        { value: 'stretch', label: 'Esticar' }, { value: 'start', label: 'Topo' },
        { value: 'center', label: 'Centro' }, { value: 'end', label: 'Base' },
      ] },
      { key: 'stack', label: 'No celular', type: 'select', options: [
        { value: '1', label: 'Empilhar colunas' }, { value: '0', label: 'Manter lado a lado' },
      ] },
      { key: 'bg', label: 'Cor de fundo', type: 'color' },
    ],
    render: (p, kids) => {
      const n = Math.min(4, Math.max(1, Number(p.cols) || 2));
      return (
        <section style={{ background: p.bg || undefined, padding: `${Number(p.pad) || 0}px` }}>
          <style>{`@media(max-width:640px){.sll-cols[data-stack="1"]{grid-template-columns:1fr !important}}`}</style>
          <div
            className="sll-cols"
            data-stack={p.stack}
            style={{ display: 'grid', gridTemplateColumns: `repeat(${n},minmax(0,1fr))`, gap: `${Number(p.gap) || 0}px`, alignItems: p.align || 'stretch' }}
          >
            {Array.from({ length: n }, (_, i) => (
              <div key={i} style={{ minWidth: 0 }}>{kids?.[i]}</div>
            ))}
          </div>
        </section>
      );
    },
  },
  video: {
    label: 'Vídeo',
    defaults: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    fields: [{ key: 'url', label: 'URL (YouTube ou MP4)' }],
    render: (p) => (
      <section className="px-8 py-8">
        {/\.mp4($|\?)/.test(p.url) ? (
          <video src={p.url} controls preload="none" className="w-full rounded-lg" />
        ) : (
          <iframe src={toEmbed(p.url)} loading="lazy" className="aspect-video w-full rounded-lg" allowFullScreen title="Vídeo" />
        )}
      </section>
    ),
  },
  testimonials: {
    label: 'Depoimentos',
    defaults: {
      n1: 'Maria', t1: 'Produto incrível, superou as expectativas!',
      n2: 'João', t2: 'Entrega rápida e qualidade excelente.',
      n3: 'Ana', t3: 'Recomendo para todos.',
    },
    fields: [
      { key: 'n1', label: 'Nome 1' }, { key: 't1', label: 'Depoimento 1', multiline: true },
      { key: 'n2', label: 'Nome 2' }, { key: 't2', label: 'Depoimento 2', multiline: true },
      { key: 'n3', label: 'Nome 3' }, { key: 't3', label: 'Depoimento 3', multiline: true },
    ],
    render: (p) => (
      <section className="grid gap-4 px-8 py-10 md:grid-cols-3">
        {['1', '2', '3'].map((i) => (
          <figure key={i} className="rounded-lg border bg-white p-5 shadow-sm">
            <blockquote className="text-gray-700">“{p[`t${i}`]}”</blockquote>
            <figcaption className="mt-3 text-sm font-semibold">{p[`n${i}`]}</figcaption>
          </figure>
        ))}
      </section>
    ),
  },
  faq: {
    label: 'FAQ',
    defaults: {
      q1: 'Qual o prazo de entrega?', a1: 'De 3 a 7 dias úteis.',
      q2: 'Posso trocar o produto?', a2: 'Sim, em até 7 dias após o recebimento.',
      q3: 'Quais formas de pagamento?', a3: 'Cartão, PIX e boleto.',
    },
    fields: [
      { key: 'q1', label: 'Pergunta 1' }, { key: 'a1', label: 'Resposta 1', multiline: true },
      { key: 'q2', label: 'Pergunta 2' }, { key: 'a2', label: 'Resposta 2', multiline: true },
      { key: 'q3', label: 'Pergunta 3' }, { key: 'a3', label: 'Resposta 3', multiline: true },
    ],
    render: (p) => (
      <section className="mx-auto max-w-3xl space-y-2 px-8 py-10">
        {['1', '2', '3'].map((i) => (
          <details key={i} className="rounded-lg border bg-white p-4">
            <summary className="cursor-pointer font-semibold">{p[`q${i}`]}</summary>
            <p className="mt-2 text-gray-600">{p[`a${i}`]}</p>
          </details>
        ))}
      </section>
    ),
  },
  timer: {
    label: 'Timer',
    defaults: { label: 'A oferta termina em', endsAt: '2026-12-31T23:59', bg: '#dc2626' },
    fields: [
      { key: 'label', label: 'Texto' },
      { key: 'endsAt', label: 'Data final (AAAA-MM-DDTHH:MM)' },
      { key: 'bg', label: 'Cor de fundo' },
    ],
    render: (p) => (
      <section style={{ background: p.bg }} className="px-8 py-6 text-center text-white" data-sll-timer={p.endsAt}>
        <p className="text-sm uppercase opacity-90">{p.label}</p>
        <p className="mt-1 font-mono text-3xl font-bold" data-sll-timer-display>00d 00h 00m 00s</p>
      </section>
    ),
  },
  form: {
    label: 'Formulário',
    defaults: { title: 'Receba nossas ofertas', button: 'Quero receber', success: 'Obrigado! Cadastro realizado.' },
    fields: [
      { key: 'title', label: 'Título' },
      { key: 'button', label: 'Texto do botão' },
      { key: 'success', label: 'Mensagem de sucesso' },
    ],
    render: (p) => (
      <section className="mx-auto max-w-md space-y-3 px-8 py-10" data-sll-form>
        <h2 className="text-center text-2xl font-bold">{p.title}</h2>
        <input name="name" placeholder="Seu nome" className="w-full rounded border p-3" />
        <input name="email" type="email" placeholder="Seu e-mail" className="w-full rounded border p-3" />
        <input name="whatsapp" placeholder="WhatsApp" className="w-full rounded border p-3" />
        <span className="block rounded-lg bg-emerald-600 py-3 text-center font-semibold text-white">{p.button}</span>
      </section>
    ),
  },
  product: {
    label: 'Produto',
    defaults: {
      layout: 'horizontal', image: 'https://placehold.co/600x600', name: 'Nome do produto', desc: '',
      price: 'R$ 199,90', cta: 'Comprar agora', href: '#',
      nameSize: '', nameColor: '#111827', nameStyle: 'bold',
      descSize: '', descColor: '#4b5563', descStyle: 'normal',
      priceSize: '', priceColor: '#059669', priceStyle: 'bold',
      ctaBg: '#059669',
    },
    fields: [
      { key: 'layout', label: 'Layout', type: 'select', options: [
        { value: 'horizontal', label: 'Imagem ao lado' },
        { value: 'card', label: 'Card (foto em cima)' },
        { value: 'mini', label: 'Miniatura em cima' },
      ] },
      { key: 'image', label: 'URL da imagem' },
      { key: 'name', label: 'Nome' },
      { key: 'nameSize', label: 'Nome: tamanho (px, vazio = padrão)', type: 'number', min: 8, max: 80 },
      { key: 'nameColor', label: 'Nome: cor', type: 'color' },
      { key: 'nameStyle', label: 'Nome: estilo', type: 'select', options: STYLE_OPTIONS },
      { key: 'desc', label: 'Descrição (opcional)', multiline: true },
      { key: 'descSize', label: 'Descrição: tamanho (px, vazio = padrão)', type: 'number', min: 8, max: 60 },
      { key: 'descColor', label: 'Descrição: cor', type: 'color' },
      { key: 'descStyle', label: 'Descrição: estilo', type: 'select', options: STYLE_OPTIONS },
      { key: 'price', label: 'Preço' },
      { key: 'priceSize', label: 'Preço: tamanho (px, vazio = padrão)', type: 'number', min: 8, max: 80 },
      { key: 'priceColor', label: 'Preço: cor', type: 'color' },
      { key: 'priceStyle', label: 'Preço: estilo', type: 'select', options: STYLE_OPTIONS },
      { key: 'cta', label: 'Texto do botão' },
      { key: 'ctaBg', label: 'Botão: cor de fundo', type: 'color' },
      { key: 'href', label: 'Link de compra' },
    ],
    render: (p) => {
      const layout = p.layout || 'horizontal';
      const mini = layout === 'mini';
      const horizontal = layout === 'horizontal';
      const size = (v: string | undefined, d: number) => (Number(v) > 0 ? Number(v) : d);
      const style = (s: string | undefined, d: string) => {
        const k = s || d;
        return {
          fontWeight: k === 'bold' || k === 'bolditalic' ? 700 : 400,
          fontStyle: k === 'italic' || k === 'bolditalic' ? ('italic' as const) : ('normal' as const),
        };
      };
      const nameEl = (
        <h2 style={{ margin: 0, fontSize: size(p.nameSize, horizontal ? 30 : mini ? 14 : 20), color: p.nameColor || '#111827', lineHeight: 1.2, ...style(p.nameStyle, 'bold') }}>{p.name}</h2>
      );
      const descEl = p.desc ? (
        <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: size(p.descSize, mini ? 12 : 14), color: p.descColor || '#4b5563', ...style(p.descStyle, 'normal') }}>{p.desc}</p>
      ) : null;
      const priceEl = (
        <p style={{ margin: 0, fontSize: size(p.priceSize, horizontal ? 24 : mini ? 16 : 22), color: p.priceColor || '#059669', ...style(p.priceStyle, 'bold') }}>{p.price}</p>
      );
      const btn = (
        <a href={p.href} style={{ display: 'inline-block', background: p.ctaBg || '#059669', color: '#fff', padding: '12px 24px', borderRadius: 8, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>{p.cta}</a>
      );
      if (horizontal) {
        return (
          <section className="mx-auto grid max-w-4xl gap-8 px-8 py-10 md:grid-cols-2">
            <img src={p.image} alt={p.name} loading="lazy" className="w-full rounded-lg" />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, alignItems: 'flex-start' }}>
              {nameEl}{descEl}{priceEl}{btn}
            </div>
          </section>
        );
      }
      return (
        <section style={{ padding: '24px 32px' }}>
          <div
            style={{
              margin: '0 auto', maxWidth: mini ? 220 : 360, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8, textAlign: 'center', padding: 16,
              border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff',
            }}
          >
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              style={mini
                ? { width: 110, height: 110, objectFit: 'cover', borderRadius: 8 }
                : { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 8 }}
            />
            {nameEl}{descEl}{priceEl}{btn}
          </div>
        </section>
      );
    },
  },
};