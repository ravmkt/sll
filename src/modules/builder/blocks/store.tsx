import type { CSSProperties } from 'react';
import { Clock, CreditCard, Gift, Headphones, Heart, Package, RefreshCw, ShieldCheck, Star, Truck } from 'lucide-react';
import type { BlockType } from '../types';
import type { BlockDef, Field } from '../registry-extra';
import { ALIGN_OPTIONS, boxCss, boxFields, num, safeUrl, textCss, textFields } from '../styleKit';

const ICONS: Record<string, React.ElementType> = {
  truck: Truck, refresh: RefreshCw, shield: ShieldCheck, card: CreditCard, gift: Gift,
  clock: Clock, star: Star, heart: Heart, support: Headphones, package: Package,
};

const ICON_OPTIONS = [
  { value: 'truck', label: 'Caminh\u00e3o (frete)' },
  { value: 'refresh', label: 'Troca / devolu\u00e7\u00e3o' },
  { value: 'shield', label: 'Seguran\u00e7a' },
  { value: 'card', label: 'Cart\u00e3o / pagamento' },
  { value: 'gift', label: 'Presente' },
  { value: 'clock', label: 'Prazo / rel\u00f3gio' },
  { value: 'star', label: 'Estrela' },
  { value: 'heart', label: 'Cora\u00e7\u00e3o' },
  { value: 'support', label: 'Atendimento' },
  { value: 'package', label: 'Pacote' },
];

const DEFAULT_ICONS = ['truck', 'refresh', 'shield', 'card'];

const itemFields = (n: number): Field[] => [
  { key: `i${n}`, label: `Item ${n}: \u00edcone`, type: 'select', options: ICON_OPTIONS, group: `Item ${n}`, def: DEFAULT_ICONS[n - 1] },
  { key: `t${n}`, label: `Item ${n}: t\u00edtulo`, group: `Item ${n}` },
  { key: `d${n}`, label: `Item ${n}: texto`, group: `Item ${n}` },
];

export const STORE_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
  announcement: {
    label: 'Barra de an\u00fancio',
    defaults: {
      text: 'Frete gr\u00e1tis em compras acima de R$ 199',
      href: '',
      bg: '#111827',
      align: 'center',
      pad: '10',
    },
    fields: [
      { key: 'text', label: 'Texto do an\u00fancio' },
      { key: 'href', label: 'Link (opcional)' },
      ...textFields('text', 'Texto', 40, { size: '14', color: '#ffffff', style: 'bold' }),
      { key: 'bg', label: 'Cor da barra', type: 'color', group: 'Barra' },
      { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 60, group: 'Barra', def: '10' },
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Barra', def: 'center' },
    ],
    render: (p) => (
      <section
        style={{
          background: p.bg || '#111827',
          padding: `${num(p.pad, 10)}px 16px`,
          textAlign: (p.align || 'center') as CSSProperties['textAlign'],
          ...textCss(p, 'text', { size: 14, color: '#ffffff', style: 'bold' }),
        }}
      >
        {p.href ? (
          <a href={safeUrl(p.href)} style={{ color: 'inherit', textDecoration: 'none' }}>{p.text}</a>
        ) : (
          p.text
        )}
      </section>
    ),
  },
  highlights: {
    label: 'Destaques informativos',
    defaults: {
      count: '3',
      bg: '#f9fafb',
      pad: '24',
      gap: '16',
      align: 'center',
      iconSize: '32',
      iconColor: '#111827',
      i1: 'truck', t1: 'Frete gr\u00e1tis', d1: 'Em compras acima de R$ 199',
      i2: 'refresh', t2: 'Troca f\u00e1cil', d2: '7 dias para trocar',
      i3: 'shield', t3: 'Compra segura', d3: 'Seus dados protegidos',
      i4: 'card', t4: 'At\u00e9 12x', d4: 'No cart\u00e3o de cr\u00e9dito',
    },
    fields: [
      { key: 'count', label: 'Quantidade de itens', type: 'select', options: [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }], group: 'Faixa', def: '3' },
      { key: 'bg', label: 'Cor de fundo da faixa', type: 'color', group: 'Faixa', def: '#f9fafb' },
      { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 120, group: 'Faixa', def: '24' },
      { key: 'gap', label: 'Espa\u00e7o entre itens (px)', type: 'number', min: 0, max: 80, group: 'Faixa', def: '16' },
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Faixa', def: 'center' },
      { key: 'iconSize', label: '\u00cdcone: tamanho (px)', type: 'number', min: 12, max: 96, group: '\u00cdcone', def: '32' },
      { key: 'iconColor', label: '\u00cdcone: cor', type: 'color', group: '\u00cdcone', def: '#111827' },
      ...itemFields(1),
      ...itemFields(2),
      ...itemFields(3),
      ...itemFields(4),
      ...textFields('title', 'T\u00edtulo', 40, { size: '16', color: '#111827', style: 'bold' }),
      ...textFields('desc', 'Texto', 40, { size: '14', color: '#4b5563', style: 'normal' }),
      ...boxFields('card', 'Cart\u00e3o', true, { pad: '16', radius: '8' }),
    ],
    render: (p) => {
      const n = Math.min(4, Math.max(1, num(p.count, 3)));
      const al = p.align || 'center';
      const flex = al === 'left' ? 'flex-start' : al === 'right' ? 'flex-end' : 'center';
      const items = [1, 2, 3, 4].slice(0, n).filter((i) => p[`t${i}`] || p[`d${i}`]);
      return (
        <section style={{ background: p.bg || '#f9fafb', padding: `${num(p.pad, 24)}px 16px` }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: num(p.gap, 16),
              maxWidth: 1100,
              margin: '0 auto',
            }}
          >
            {items.map((i) => {
              const Ic = ICONS[p[`i${i}`]] || Truck;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: flex,
                    textAlign: al as CSSProperties['textAlign'],
                    gap: 6,
                    ...boxCss(p, 'card', { pad: 16, radius: 8 }),
                  }}
                >
                  <Ic size={num(p.iconSize, 32)} color={p.iconColor || '#111827'} strokeWidth={2} />
                  {p[`t${i}`] ? <div style={textCss(p, 'title', { size: 16, color: '#111827', style: 'bold' })}>{p[`t${i}`]}</div> : null}
                  {p[`d${i}`] ? <div style={textCss(p, 'desc', { size: 14, color: '#4b5563', style: 'normal' })}>{p[`d${i}`]}</div> : null}
                </div>
              );
            })}
          </div>
        </section>
      );
    },
  },
};