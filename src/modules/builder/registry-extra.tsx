import type { ReactElement } from 'react';
import type { BlockType } from './types';

export interface Field { key: string; label: string; multiline?: boolean }
export interface BlockDef {
  label: string;
  defaults: Record<string, string>;
  fields: Field[];
  render: (p: Record<string, string>) => ReactElement;
}

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : url;
}

export const EXTRA_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
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
    defaults: { image: 'https://placehold.co/600x600', name: 'Nome do produto', price: 'R$ 199,90', cta: 'Comprar agora', href: '#' },
    fields: [
      { key: 'image', label: 'URL da imagem' },
      { key: 'name', label: 'Nome' },
      { key: 'price', label: 'Preço' },
      { key: 'cta', label: 'Texto do botão' },
      { key: 'href', label: 'Link de compra' },
    ],
    render: (p) => (
      <section className="mx-auto grid max-w-4xl gap-8 px-8 py-10 md:grid-cols-2">
        <img src={p.image} alt={p.name} loading="lazy" className="w-full rounded-lg" />
        <div className="flex flex-col justify-center gap-3">
          <h2 className="text-3xl font-bold">{p.name}</h2>
          <p className="text-2xl font-semibold text-emerald-600">{p.price}</p>
          <span className="inline-block rounded-lg bg-emerald-600 px-6 py-3 text-center font-semibold text-white">{p.cta}</span>
        </div>
      </section>
    ),
  },
};
