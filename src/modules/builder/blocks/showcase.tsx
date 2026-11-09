import type { CSSProperties } from 'react';
import type { BlockType } from '../types';
import type { BlockDef } from '../registry-extra';
import { boxCss, boxFields, num, parseItems, safeUrl, textCss, textFields } from '../styleKit';

const VT_CSS = `.sll-vt{display:grid;grid-template-columns:repeat(var(--d),minmax(0,1fr));gap:var(--g)}
.sll-vt[data-l="c"]{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.sll-vt[data-l="c"]::-webkit-scrollbar{display:none}
.sll-vt[data-l="c"]>.sll-vt-i{flex:0 0 calc((100% - (var(--d) - 1) * var(--g)) / var(--d));scroll-snap-align:start}
.sll-vt-i{min-width:0}
@media(max-width:640px){
.sll-vt{grid-template-columns:repeat(var(--m),minmax(0,1fr))}
.sll-vt[data-l="c"]>.sll-vt-i{flex:0 0 calc((100% - (var(--m) - 1) * var(--g)) / var(--m))}
}`;

const brl = (v: string | undefined) => {
  const n = Number(v);
  return v && isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
};

const DEFAULT_ITEMS = JSON.stringify(
  [1, 2, 3, 4].map((n) => ({ id: '', n: `Produto exemplo ${n}`, p: '199.9', s: '', i: 'https://placehold.co/600x600', u: '' })),
);

export const SHOWCASE_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
  showcase: {
    label: 'Vitrine de produtos',
    defaults: {
      title: 'Mais vendidos',
      items: DEFAULT_ITEMS,
      layout: 'grid',
      colsD: '4',
      colsM: '2',
      gap: '16',
      ratio: '1/1',
      showBtn: 'yes',
      cta: 'Comprar',
      allText: 'Ver todos',
      allHref: '',
      secPad: '32',
    },
    fields: [
      { key: 'title', label: 'T\u00edtulo da vitrine' },
      { key: 'items', label: 'Produtos', type: 'products', group: 'Produtos', maxItems: 24 },
      { key: 'allText', label: 'Texto do link "Ver todos"', group: 'Produtos' },
      { key: 'allHref', label: 'Link do "Ver todos" (vazio = oculto)', group: 'Produtos' },
      {
        key: 'layout', label: 'Formato', type: 'select', group: 'Layout', def: 'grid',
        options: [{ value: 'grid', label: 'Grade' }, { value: 'carousel', label: 'Carrossel (arrastar)' }],
      },
      {
        key: 'colsD', label: 'Colunas no computador', type: 'select', group: 'Layout', def: '4',
        options: ['2', '3', '4', '5', '6'].map((v) => ({ value: v, label: v })),
      },
      {
        key: 'colsM', label: 'Colunas no celular', type: 'select', group: 'Layout', def: '2',
        options: [
          { value: '1', label: '1' }, { value: '1.5', label: '1,5 (mostra o pr\u00f3ximo)' },
          { value: '2', label: '2' }, { value: '2.5', label: '2,5 (mostra o pr\u00f3ximo)' },
        ],
      },
      {
        key: 'ratio', label: 'Formato da foto', type: 'select', group: 'Layout', def: '1/1',
        options: [{ value: '1/1', label: 'Quadrada' }, { value: '4/5', label: 'Retrato 4:5' }, { value: '3/4', label: 'Retrato 3:4' }],
      },
      { key: 'gap', label: 'Espa\u00e7o entre cards (px)', type: 'number', min: 0, max: 60, group: 'Layout', def: '16' },
      {
        key: 'showBtn', label: 'Bot\u00e3o de compra', type: 'select', group: 'Bot\u00e3o', def: 'yes',
        options: [{ value: 'yes', label: 'Mostrar' }, { value: 'no', label: 'Ocultar' }],
      },
      { key: 'cta', label: 'Texto do bot\u00e3o', group: 'Bot\u00e3o' },
      ...textFields('title', 'T\u00edtulo', 60, { size: '24', color: '#111827', style: 'bold' }),
      ...textFields('name', 'Nome do produto', 28, { size: '15', color: '#111827', style: 'normal' }),
      ...textFields('price', 'Pre\u00e7o', 40, { size: '18', color: '#059669', style: 'bold' }),
      ...textFields('cta', 'Bot\u00e3o', 28, { size: '14', color: '#ffffff', style: 'bold' }),
      ...textFields('all', 'Link "Ver todos"', 28, { size: '14', color: '#2563eb', style: 'bold' }),
      ...boxFields('cta', 'Bot\u00e3o', true, { bg: '#059669', pad: '10', bw: '0', radius: '8' }),
      ...boxFields('card', 'Card', true, { bg: '#ffffff', pad: '12', bw: '1', radius: '12' }),
      { key: 'secBg', label: 'Se\u00e7\u00e3o: cor de fundo', type: 'color', group: 'Se\u00e7\u00e3o' },
      { key: 'secPad', label: 'Se\u00e7\u00e3o: espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: 'Se\u00e7\u00e3o', def: '32' },
    ],
    render: (p) => {
      const list = parseItems(p.items).filter((x) => x.n);
      const carousel = p.layout === 'carousel';
      const vars = { '--d': p.colsD || '4', '--m': p.colsM || '2', '--g': `${num(p.gap, 16)}px` } as unknown as CSSProperties;
      const showBtn = p.showBtn !== 'no';
      const ratio = p.ratio || '1/1';
      return (
        <section style={{ background: p.secBg || undefined, padding: `${num(p.secPad, 32)}px 16px` }}>
          <style dangerouslySetInnerHTML={{ __html: VT_CSS }} />
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {p.title || p.allHref ? (
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0, ...textCss(p, 'title', { size: 24, color: '#111827', style: 'bold' }) }}>{p.title}</h2>
                {p.allHref ? (
                  <a href={safeUrl(p.allHref)} style={{ textDecoration: 'none', whiteSpace: 'nowrap', ...textCss(p, 'all', { size: 14, color: '#2563eb', style: 'bold' }) }}>
                    {p.allText || 'Ver todos'}
                  </a>
                ) : null}
              </div>
            ) : null}
            <div className="sll-vt" data-l={carousel ? 'c' : 'g'} style={vars}>
              {list.map((it, k) => {
                const url = it.u ? safeUrl(it.u) : undefined;
                const sale = Number(it.s);
                const reg = Number(it.p);
                const onSale = !!it.s && sale > 0 && reg > 0 && sale < reg;
                return (
                  <div
                    key={k}
                    className="sll-vt-i"
                    style={{ display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box', ...boxCss(p, 'card', { bg: '#ffffff', bw: 1, radius: 12, pad: 12 }) }}
                  >
                    <a href={url} style={{ display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: 'inherit' }}>
                      {it.i ? (
                        <img src={safeUrl(it.i)} alt={it.n} loading="lazy" draggable={false} style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', borderRadius: 8, display: 'block', background: '#f3f4f6' }} />
                      ) : (
                        <div style={{ width: '100%', aspectRatio: ratio, borderRadius: 8, background: '#f3f4f6' }} />
                      )}
                      <div style={textCss(p, 'name', { size: 15, color: '#111827', style: 'normal' })}>{it.n}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
                        <span style={textCss(p, 'price', { size: 18, color: '#059669', style: 'bold' })}>{brl(onSale ? it.s : it.p)}</span>
                        {onSale ? <s style={{ color: '#9ca3af', fontSize: 13 }}>{brl(it.p)}</s> : null}
                      </div>
                    </a>
                    {showBtn ? (
                      <a
                        href={url}
                        style={{
                          display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 'auto',
                          ...boxCss(p, 'cta', { bg: '#059669', bw: 0, radius: 8, pad: 10, btn: true }),
                          ...textCss(p, 'cta', { size: 14, color: '#ffffff', style: 'bold' }),
                        }}
                      >
                        {p.cta || 'Comprar'}
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );
    },
  },
};