import type { ReactElement, ReactNode } from 'react';
import type { BlockType } from './types';
import { boxCss, boxFields, num, safeUrl, textCss, textFields } from './styleKit';

export interface Field {
  key: string;
  label: string;
  multiline?: boolean;
  type?: 'text' | 'color' | 'number' | 'select' | 'datetime' | 'repeater';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  group?: string;
  item?: Field[];
  itemLabel?: string;
  itemDefaults?: Record<string, string>;
  maxItems?: number;
}
export interface BlockDef {
  label: string;
  defaults: Record<string, string>;
  fields: Field[];
  render: (p: Record<string, string>, kids?: ReactNode[]) => ReactElement;
}

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return safeUrl(yt ? `https://www.youtube.com/embed/${yt[1]}` : url);
}

const PROD_CSS = '.sll-prod{display:grid;grid-template-columns:1fr 1fr;gap:32px}@media(max-width:700px){.sll-prod{grid-template-columns:1fr}}';
const T3_CSS = '.sll-t3{display:grid;gap:16px;grid-template-columns:repeat(3,1fr)}@media(max-width:700px){.sll-t3{grid-template-columns:1fr}}';
const COLS_CSS = '@media(max-width:640px){.sll-stack{grid-template-columns:1fr !important}}';
const card = { margin: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)' } as const;

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
          <style>{COLS_CSS}</style>
          <div
            className={p.stack === '0' ? 'sll-cols' : 'sll-cols sll-stack'}
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
      <section style={{ padding: '32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/\.mp4($|\?)/.test(p.url || '') ? (
            <video src={safeUrl(p.url)} controls preload="none" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
          ) : (
            <iframe src={toEmbed(p.url || '')} loading="lazy" allowFullScreen title="Vídeo" style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 8, display: 'block' }} />
          )}
        </div>
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
      <section style={{ padding: '40px 32px' }}>
        <style>{T3_CSS}</style>
        <div className="sll-t3" style={{ maxWidth: 900, margin: '0 auto' }}>
          {['1', '2', '3'].map((i) => (
            <figure key={i} style={card}>
              <blockquote style={{ margin: 0, color: '#374151' }}>“{p[`t${i}`]}”</blockquote>
              <figcaption style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>{p[`n${i}`]}</figcaption>
            </figure>
          ))}
        </div>
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
      <section style={{ padding: '40px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['1', '2', '3'].map((i) => (
            <details key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{p[`q${i}`]}</summary>
              <p style={{ margin: '8px 0 0', color: '#4b5563' }}>{p[`a${i}`]}</p>
            </details>
          ))}
        </div>
      </section>
    ),
  },
  timer: {
    label: 'Timer',
    defaults: { label: 'A oferta termina em', endsAt: '2026-12-31T23:59', bg: '#dc2626' },
    fields: [
      { key: 'label', label: 'Texto' },
      { key: 'endsAt', label: 'Data final', type: 'datetime' },
      { key: 'bg', label: 'Cor de fundo', type: 'color' },
    ],
    render: (p) => (
      <section
        style={{ background: p.bg || '#dc2626', color: '#fff', padding: '24px 32px', textAlign: 'center' }}
        data-end={p.endsAt}
        data-sll-timer={p.endsAt}
      >
        <p style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', opacity: 0.9 }}>{p.label}</p>
        <p data-clock data-sll-timer-display style={{ margin: '4px 0 0', fontFamily: 'ui-monospace,monospace', fontSize: 30, fontWeight: 700 }}>
          00d 00h 00m 00s
        </p>
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
    render: (p) => {
      const input = { width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 16 } as const;
      return (
        <section style={{ padding: '40px 32px' }}>
          <form data-sll-form data-success={p.success} style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, textAlign: 'center', fontSize: 24, fontWeight: 700 }}>{p.title}</h2>
            <input name="name" placeholder="Seu nome" required maxLength={120} style={input} />
            <input name="email" type="email" placeholder="Seu e-mail" required maxLength={160} style={input} />
            <input name="whatsapp" placeholder="WhatsApp" maxLength={30} style={input} />
            <button type="submit" style={{ background: '#059669', color: '#fff', padding: 12, border: 0, borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
              {p.button}
            </button>
          </form>
        </section>
      );
    },
  },
  product: {
    label: 'Produto',
    defaults: {
      layout: 'horizontal', image: 'https://placehold.co/600x600', name: 'Nome do produto', desc: '',
      price: 'R$ 199,90', cta: 'Comprar agora', href: '#',
      nameColor: '#111827', nameStyle: 'bold',
      descColor: '#4b5563', descStyle: 'normal',
      priceColor: '#059669', priceStyle: 'bold',
      ctaBg: '#059669', ctaColor: '#ffffff', ctaStyle: 'bold',
    },
    fields: [
      { key: 'layout', label: 'Layout', type: 'select', options: [
        { value: 'horizontal', label: 'Imagem ao lado' },
        { value: 'card', label: 'Card (foto em cima)' },
        { value: 'mini', label: 'Miniatura em cima' },
      ] },
      { key: 'image', label: 'URL da imagem' },
      { key: 'name', label: 'Nome' },
      { key: 'desc', label: 'Descrição (opcional)', multiline: true },
      { key: 'price', label: 'Preço' },
      { key: 'cta', label: 'Texto do botão' },
      { key: 'href', label: 'Link de compra' },
      ...textFields('name', 'Nome'),
      ...textFields('desc', 'Descrição', 60),
      ...textFields('price', 'Preço'),
      ...textFields('cta', 'Botão', 40),
      ...boxFields('cta', 'Botão'),
      ...boxFields('card', 'Card'),
      { key: 'imgRadius', label: 'Imagem: arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Imagem e seção' },
      { key: 'secBg', label: 'Seção: cor de fundo', type: 'color', group: 'Imagem e seção' },
      { key: 'secPad', label: 'Seção: espaço vertical (px)', type: 'number', min: 0, max: 200, group: 'Imagem e seção' },
    ],
    render: (p) => {
      const layout = p.layout || 'horizontal';
      const mini = layout === 'mini';
      const horizontal = layout === 'horizontal';
      const nameEl = (
        <h2 style={{ margin: 0, lineHeight: 1.2, ...textCss(p, 'name', { size: horizontal ? 30 : mini ? 14 : 20, color: '#111827', style: 'bold' }) }}>{p.name}</h2>
      );
      const descEl = p.desc ? (
        <p style={{ margin: 0, whiteSpace: 'pre-line', ...textCss(p, 'desc', { size: mini ? 12 : 14, color: '#4b5563', style: 'normal' }) }}>{p.desc}</p>
      ) : null;
      const priceEl = (
        <p style={{ margin: 0, ...textCss(p, 'price', { size: horizontal ? 24 : mini ? 16 : 22, color: '#059669', style: 'bold' }) }}>{p.price}</p>
      );
      const btn = (
        <a
          href={safeUrl(p.href)}
          style={{
            display: 'inline-block', textAlign: 'center', textDecoration: 'none',
            ...boxCss(p, 'cta', { bg: '#059669', bw: 0, radius: 8, pad: 12, btn: true }),
            ...textCss(p, 'cta', { size: 16, color: '#ffffff', style: 'bold' }),
          }}
        >
          {p.cta}
        </a>
      );
      const imgR = num(p.imgRadius, 8);
      const secStyle = { background: p.secBg || undefined, padding: `${num(p.secPad, horizontal ? 40 : 24)}px 32px` };
      if (horizontal) {
        return (
          <section style={secStyle}>
            <style>{PROD_CSS}</style>
            <div className="sll-prod" style={{ maxWidth: 896, margin: '0 auto', ...boxCss(p, 'card', { bw: 0, pad: 0, radius: 0 }) }}>
              <img src={safeUrl(p.image)} alt={p.name} loading="lazy" style={{ width: '100%', display: 'block', borderRadius: imgR }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, alignItems: 'flex-start' }}>
                {nameEl}{descEl}{priceEl}{btn}
              </div>
            </div>
          </section>
        );
      }
      return (
        <section style={secStyle}>
          <div
            style={{
              margin: '0 auto', maxWidth: mini ? 220 : 360, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8, textAlign: 'center',
              ...boxCss(p, 'card', { bg: '#ffffff', bw: 1, bc: '#e5e7eb', radius: 12, pad: 16 }),
            }}
          >
            <img
              src={safeUrl(p.image)}
              alt={p.name}
              loading="lazy"
              style={mini
                ? { width: 110, height: 110, objectFit: 'cover', borderRadius: imgR }
                : { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: imgR }}
            />
            {nameEl}{descEl}{priceEl}{btn}
          </div>
        </section>
      );
    },
  },
};