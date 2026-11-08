import type { CSSProperties } from 'react';
import type { BlockType } from '../types';
import type { BlockDef } from '../registry-extra';
import { ALIGN_OPTIONS, num, safeUrl, textCss, textFields } from '../styleKit';

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
};