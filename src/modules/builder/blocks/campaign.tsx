import type { CSSProperties, ReactNode } from 'react';
import type { BlockType } from '../types';
import type { BlockDef, Field } from '../registry-extra';
import { ALIGN_OPTIONS, FONT_OPTIONS, STYLE_OPTIONS, num, parseItems, safeUrl } from '../styleKit';

const RCSS =
  '.sll-r{font-size:var(--d)}.sll-lg{height:var(--lh)}@media(max-width:640px){.sll-r{font-size:var(--m)}.sll-lg{height:var(--lhm)}}';
const CD_CSS =
  '.sll-cd{gap:var(--g)}.sll-cdb{min-width:var(--w)}@media(max-width:640px){.sll-cd{gap:var(--gm)}.sll-cdb{min-width:var(--wm)}}';

const Css = ({ s }: { s: string }) => <style dangerouslySetInnerHTML={{ __html: s }} />;
const align = (p: Record<string, string>, d: string) => (p.align || d) as CSSProperties['textAlign'];
const rich = (s = ''): ReactNode => s.split('**').map((t, i) => (i % 2 ? <strong key={i}>{t}</strong> : t));
const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, '0');

function tf(k: string, label: string, s: number, m: number, c: string, st = 'normal'): Field[] {
  return [
    { key: `${k}Size`, label: `${label}: tamanho no PC (px)`, type: 'number', min: 8, max: 120, group: label, def: String(s) },
    { key: `${k}SizeM`, label: `${label}: tamanho no celular (px)`, type: 'number', min: 8, max: 120, group: label, def: String(m) },
    { key: `${k}Color`, label: `${label}: cor`, type: 'color', group: label, def: c },
    { key: `${k}Style`, label: `${label}: estilo`, type: 'select', options: STYLE_OPTIONS, group: label, def: st },
    { key: `${k}Font`, label: `${label}: fonte`, type: 'select', options: FONT_OPTIONS, group: label },
  ];
}

function tcss(p: Record<string, string>, k: string, d: { s: number; m: number; c: string; st?: string }): CSSProperties {
  const st = p[`${k}Style`] || d.st || 'normal';
  return {
    '--d': `${num(p[`${k}Size`], d.s)}px`,
    '--m': `${num(p[`${k}SizeM`], d.m)}px`,
    color: p[`${k}Color`] || d.c,
    fontWeight: st === 'bold' || st === 'bolditalic' ? 700 : 400,
    fontStyle: st === 'italic' || st === 'bolditalic' ? 'italic' : 'normal',
    fontFamily: p[`${k}Font`] || undefined,
  } as unknown as CSSProperties;
}

const secFields = (pad: string): Field[] => [
  { key: 'bg', label: 'Cor de fundo', type: 'color', group: 'Se\u00e7\u00e3o' },
  { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: 'Se\u00e7\u00e3o', def: pad },
  { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Se\u00e7\u00e3o', def: 'center' },
];
const sec = (p: Record<string, string>, d: number): CSSProperties => ({
  background: p.bg || undefined,
  padding: `${num(p.pad, d)}px 24px`,
  textAlign: align(p, 'center'),
});

function parts(endsAt?: string): number[] {
  const t = endsAt ? new Date(endsAt).getTime() : NaN;
  const s = Number.isFinite(t) ? Math.max(0, Math.floor((t - Date.now()) / 1000)) : 0;
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
}

const DARK = '#0b0a08';

export const CAMPAIGN_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
  brandbar: {
    label: 'Cabe\u00e7alho da marca',
    defaults: { logo: '', name: 'SUA MARCA', logoH: '44', logoHM: '36', spacing: '3', bg: DARK, pad: '20', align: 'center' },
    fields: [
      { key: 'logo', label: 'Logo da marca', type: 'upload', accept: 'image' },
      { key: 'name', label: 'Nome da marca (opcional)' },
      { key: 'logoH', label: 'Altura do logo no PC (px)', type: 'number', min: 16, max: 200, def: '44' },
      { key: 'logoHM', label: 'Altura do logo no celular (px)', type: 'number', min: 16, max: 200, def: '36' },
      { key: 'spacing', label: 'Espa\u00e7amento das letras (px)', type: 'number', min: 0, max: 12, def: '3' },
      ...tf('name', 'Nome', 20, 16, '#d4af37', 'bold'),
      ...secFields('20'),
    ],
    render: (p) => (
      <section style={sec(p, 20)}>
        <Css s={RCSS} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          {p.logo ? (
            <img
              className="sll-lg"
              src={safeUrl(p.logo)}
              alt={p.name || 'Logo'}
              style={{ '--lh': `${num(p.logoH, 44)}px`, '--lhm': `${num(p.logoHM, 36)}px`, width: 'auto', display: 'block' } as unknown as CSSProperties}
            />
          ) : null}
          {p.name ? (
            <span className="sll-r" style={{ letterSpacing: `${num(p.spacing, 3)}px`, ...tcss(p, 'name', { s: 20, m: 16, c: '#d4af37', st: 'bold' }) }}>
              {p.name}
            </span>
          ) : null}
        </div>
      </section>
    ),
  },

  badge: {
    label: 'Selo de campanha',
    defaults: { text: '\u2726 BLACK FRIDAY \u00b7 16 A 30 DE NOVEMBRO \u2726', bc: '#8a6d2f', fill: '', radius: '999', bg: DARK, pad: '16', align: 'center' },
    fields: [
      { key: 'text', label: 'Texto do selo' },
      { key: 'bc', label: 'Cor da borda', type: 'color', def: '#8a6d2f' },
      { key: 'fill', label: 'Cor de preenchimento', type: 'color' },
      { key: 'radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 999, def: '999' },
      ...tf('t', 'Texto', 13, 11, '#d4af37', 'bold'),
      ...secFields('16'),
    ],
    render: (p) => (
      <section style={sec(p, 16)}>
        <Css s={RCSS} />
        <span
          className="sll-r"
          style={{
            display: 'inline-block', padding: '8px 18px', letterSpacing: '.08em', textTransform: 'uppercase',
            border: `1px solid ${p.bc || '#8a6d2f'}`, background: p.fill || undefined, borderRadius: num(p.radius, 999),
            ...tcss(p, 't', { s: 13, m: 11, c: '#d4af37', st: 'bold' }),
          }}
        >
          {p.text}
        </span>
      </section>
    ),
  },

  chips: {
    label: 'Selos de benef\u00edcios',
    defaults: {
      items: JSON.stringify([
        { t: '\ud83d\uded2 Progressivo at\u00e9 35% OFF' },
        { t: '\u26a1 5% OFF no PIX' },
        { t: '\ud83d\udcb3 6x sem juros' },
        { t: '\ud83d\ude9a Frete gr\u00e1tis R$ 459+' },
      ]),
      chipBg: '#14110d', chipBc: '#5c4a1f', gap: '10', bg: DARK, pad: '16', align: 'center',
    },
    fields: [
      { key: 'items', label: 'Selos', type: 'repeater', itemLabel: 'Selo', itemDefaults: { t: 'Novo selo' }, maxItems: 8, item: [{ key: 't', label: 'Texto' }] },
      { key: 'chipBg', label: 'Cor de fundo do selo', type: 'color', group: 'Selo', def: '#14110d' },
      { key: 'chipBc', label: 'Cor da borda do selo', type: 'color', group: 'Selo', def: '#5c4a1f' },
      { key: 'gap', label: 'Espa\u00e7o entre selos (px)', type: 'number', min: 0, max: 40, group: 'Selo', def: '10' },
      ...tf('t', 'Texto', 13, 12, '#e5e7eb'),
      ...secFields('16'),
    ],
    render: (p) => (
      <section style={sec(p, 16)}>
        <Css s={RCSS} />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: num(p.gap, 10) }}>
          {parseItems(p.items).filter((x) => x.t).map((x, i) => (
            <span
              key={i}
              className="sll-r"
              style={{
                padding: '8px 16px', borderRadius: 999,
                background: p.chipBg || '#14110d', border: `1px solid ${p.chipBc || '#5c4a1f'}`,
                ...tcss(p, 't', { s: 13, m: 12, c: '#e5e7eb' }),
              }}
            >
              {x.t}
            </span>
          ))}
        </div>
      </section>
    ),
  },

  heading: {
    label: 'T\u00edtulo da campanha',
    defaults: {
      l1: 'ELEG\u00c2NCIA', l2: 'N\u00c3O TIRA FOLGA',
      sub: 'Estamos preparando a nossa **maior promo\u00e7\u00e3o do ano** e o site vai abrir em breve.\nEnquanto isso, entre no nosso grupo VIP para garantir **acesso antecipado**.',
      maxW: '720', bg: DARK, pad: '24', align: 'center',
    },
    fields: [
      { key: 'l1', label: 'T\u00edtulo (linha 1)' },
      { key: 'l2', label: 'T\u00edtulo (linha 2, cor de destaque)' },
      { key: 'sub', label: 'Subt\u00edtulo (use **texto** para negrito)', multiline: true },
      { key: 'maxW', label: 'Largura m\u00e1xima (px)', type: 'number', min: 240, max: 1400, def: '720' },
      ...tf('l1', 'Linha 1', 32, 24, '#ffffff', 'bold'),
      ...tf('l2', 'Linha 2', 32, 24, '#d4af37', 'bold'),
      ...tf('sub', 'Subt\u00edtulo', 17, 15, '#e5e7eb'),
      ...secFields('24'),
    ],
    render: (p) => (
      <section style={sec(p, 24)}>
        <Css s={RCSS} />
        <div style={{ maxWidth: num(p.maxW, 720), margin: '0 auto' }}>
          <h1 style={{ margin: 0, lineHeight: 1.15 }}>
            {p.l1 ? <span className="sll-r" style={{ display: 'block', ...tcss(p, 'l1', { s: 32, m: 24, c: '#ffffff', st: 'bold' }) }}>{p.l1}</span> : null}
            {p.l2 ? <span className="sll-r" style={{ display: 'block', ...tcss(p, 'l2', { s: 32, m: 24, c: '#d4af37', st: 'bold' }) }}>{p.l2}</span> : null}
          </h1>
          {p.sub ? (
            <p className="sll-r" style={{ margin: '14px 0 0', whiteSpace: 'pre-line', lineHeight: 1.6, ...tcss(p, 'sub', { s: 17, m: 15, c: '#e5e7eb' }) }}>
              {rich(p.sub)}
            </p>
          ) : null}
        </div>
      </section>
    ),
  },

  countdown: {
    label: 'Contagem regressiva',
    defaults: {
      endsAt: '2026-11-30T23:59', lD: 'Dias', lH: 'Horas', lM: 'Min', lS: 'Seg',
      boxBg: '#14110d', boxBc: '#8a6d2f', lblColor: '#9ca3af', radius: '12',
      gap: '12', gapM: '8', boxW: '110', boxWM: '64', bg: DARK, pad: '24',
    },
    fields: [
      { key: 'endsAt', label: 'Data final', type: 'datetime' },
      { key: 'lD', label: 'R\u00f3tulo: dias', group: 'R\u00f3tulos' },
      { key: 'lH', label: 'R\u00f3tulo: horas', group: 'R\u00f3tulos' },
      { key: 'lM', label: 'R\u00f3tulo: minutos', group: 'R\u00f3tulos' },
      { key: 'lS', label: 'R\u00f3tulo: segundos', group: 'R\u00f3tulos' },
      { key: 'boxBg', label: 'Caixa: cor de fundo', type: 'color', group: 'Caixas', def: '#14110d' },
      { key: 'boxBc', label: 'Caixa: cor da borda', type: 'color', group: 'Caixas', def: '#8a6d2f' },
      { key: 'lblColor', label: 'Cor dos r\u00f3tulos', type: 'color', group: 'Caixas', def: '#9ca3af' },
      { key: 'radius', label: 'Caixa: arredondamento (px)', type: 'number', min: 0, max: 40, group: 'Caixas', def: '12' },
      { key: 'boxW', label: 'Caixa: largura no PC (px)', type: 'number', min: 40, max: 240, group: 'Caixas', def: '110' },
      { key: 'boxWM', label: 'Caixa: largura no celular (px)', type: 'number', min: 40, max: 120, group: 'Caixas', def: '64' },
      { key: 'gap', label: 'Espa\u00e7o entre caixas no PC (px)', type: 'number', min: 0, max: 40, group: 'Caixas', def: '12' },
      { key: 'gapM', label: 'Espa\u00e7o entre caixas no celular (px)', type: 'number', min: 0, max: 24, group: 'Caixas', def: '8' },
      ...tf('n', 'N\u00famero', 40, 26, '#d4af37', 'bold'),
      ...secFields('24'),
    ],
    render: (p) => {
      const v = parts(p.endsAt);
      const labels = [p.lD || 'Dias', p.lH || 'Horas', p.lM || 'Min', p.lS || 'Seg'];
      const vars = {
        '--g': `${num(p.gap, 12)}px`, '--gm': `${num(p.gapM, 8)}px`,
        '--w': `${num(p.boxW, 110)}px`, '--wm': `${num(p.boxWM, 64)}px`,
      } as unknown as CSSProperties;
      return (
        <section style={sec(p, 24)}>
          <Css s={RCSS + CD_CSS} />
          <div className="sll-cd" data-cd={p.endsAt || undefined} style={{ display: 'flex', justifyContent: 'center', ...vars }}>
            {labels.map((l, i) => (
              <div
                key={i}
                className="sll-cdb"
                style={{
                  textAlign: 'center', padding: '14px 6px', background: p.boxBg || '#14110d',
                  border: `1px solid ${p.boxBc || '#8a6d2f'}`, borderRadius: num(p.radius, 12),
                }}
              >
                <div data-u className="sll-r" style={{ lineHeight: 1.1, ...tcss(p, 'n', { s: 40, m: 26, c: '#d4af37', st: 'bold' }) }}>
                  {pad2(v[i])}
                </div>
                <div style={{ marginTop: 6, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: p.lblColor || '#9ca3af' }}>{l}</div>
              </div>
            ))}
          </div>
        </section>
      );
    },
  },

  benefits: {
    label: 'Card de benef\u00edcios',
    defaults: {
      title: '\ud83c\udfaf O QUE VEM POR A\u00cd',
      intro: 'Monte seu look e economize de verdade:',
      items: JSON.stringify([
        { ic: '\ud83d\uded2', t: '**2 pe\u00e7as** \u2192 20% OFF' },
        { ic: '\ud83d\uded2', t: '**3 pe\u00e7as** \u2192 30% OFF' },
        { ic: '\ud83d\uded2', t: '**4+ pe\u00e7as** \u2192 35% OFF' },
        { ic: '\u26a1', t: '+ 5% de desconto no PIX' },
        { ic: '\ud83c\udf81', t: 'Brinde em compras acima de R$ 300' },
      ]),
      cardBg: '#14110d', cardBc: '#5c4a1f', radius: '16', cardPad: '24', maxW: '640', bg: DARK, pad: '16',
    },
    fields: [
      { key: 'title', label: 'T\u00edtulo do card' },
      { key: 'intro', label: 'Texto de abertura (opcional)', multiline: true },
      { key: 'items', label: 'Itens', type: 'repeater', itemLabel: 'Item', itemDefaults: { ic: '\u2714', t: 'Novo benef\u00edcio' }, maxItems: 12,
        item: [{ key: 'ic', label: '\u00cdcone (emoji)' }, { key: 't', label: 'Texto (use **texto** para negrito)' }] },
      { key: 'cardBg', label: 'Card: cor de fundo', type: 'color', group: 'Card', def: '#14110d' },
      { key: 'cardBc', label: 'Card: cor da borda', type: 'color', group: 'Card', def: '#5c4a1f' },
      { key: 'radius', label: 'Card: arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Card', def: '16' },
      { key: 'cardPad', label: 'Card: espa\u00e7o interno (px)', type: 'number', min: 0, max: 80, group: 'Card', def: '24' },
      { key: 'maxW', label: 'Card: largura m\u00e1xima (px)', type: 'number', min: 240, max: 1200, group: 'Card', def: '640' },
      ...tf('title', 'T\u00edtulo', 16, 15, '#d4af37', 'bold'),
      ...tf('item', 'Itens', 15, 14, '#e5e7eb'),
      ...secFields('16'),
    ],
    render: (p) => (
      <section style={{ ...sec(p, 16), textAlign: 'left' }}>
        <Css s={RCSS} />
        <div
          style={{
            maxWidth: num(p.maxW, 640), margin: '0 auto', padding: num(p.cardPad, 24), boxSizing: 'border-box',
            background: p.cardBg || '#14110d', border: `1px solid ${p.cardBc || '#5c4a1f'}`, borderRadius: num(p.radius, 16),
          }}
        >
          {p.title ? (
            <h2 className="sll-r" style={{ margin: '0 0 12px', letterSpacing: '.06em', textTransform: 'uppercase', ...tcss(p, 'title', { s: 16, m: 15, c: '#d4af37', st: 'bold' }) }}>
              {p.title}
            </h2>
          ) : null}
          {p.intro ? (
            <p className="sll-r" style={{ margin: '0 0 14px', ...tcss(p, 'item', { s: 15, m: 14, c: '#e5e7eb' }) }}>{rich(p.intro)}</p>
          ) : null}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {parseItems(p.items).filter((x) => x.t).map((x, i) => (
              <li key={i} className="sll-r" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', ...tcss(p, 'item', { s: 15, m: 14, c: '#e5e7eb' }) }}>
                <span style={{ flexShrink: 0 }}>{x.ic}</span>
                <span>{rich(x.t)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    ),
  },
};