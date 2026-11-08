import type { CSSProperties } from 'react';
import type { BlockDef } from '../registry-extra';
import { num, safeUrl } from '../styleKit';

const BAN_CSS =
  '.sll-ban-c{container-type:inline-size}' +
  '.sll-ban-m{display:none}' +
  '@container (max-width:700px){.sll-ban-d{display:none}.sll-ban-m{display:block}}';

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const AL: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
const VA: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
const POS: Record<string, string> = { center: 'center', top: 'center top', bottom: 'center bottom', left: 'left center', right: 'right center' };

function BannerDev({ p, dev }: { p: Record<string, string>; dev: 'd' | 'm' }) {
  const m = dev === 'm';
  const k = (s: string) => p[dev + s] ?? '';
  const v = (s: string) => k(s) || (m ? p['d' + s] ?? '' : '');
  const img = v('Img');
  const alt = v('Alt');
  const link = v('Link').trim();
  const title = v('Title');
  const sub = v('Sub');
  const btn = v('Btn');
  const h = clampN(num(k('H'), m ? 240 : 420), 80, 1000);
  const mw = num(k('MaxW'), 0);
  const radius = clampN(num(k('Radius'), 0), 0, 60);
  const pad = clampN(num(k('Pad'), 0), 0, 200);
  const ov = clampN(num(k('Overlay'), 0), 0, 90);
  const color = k('Color') || '#ffffff';
  const align = k('Align') || 'center';
  const valign = k('VAlign') || 'center';
  const tSize = clampN(num(k('TSize'), m ? 24 : 40), 12, 96);
  const sSize = clampN(num(k('SSize'), m ? 14 : 18), 10, 48);
  const fit = k('Fit') === 'contain' ? 'contain' : 'cover';

  const inner = (
    <div
      style={{
        position: 'relative', overflow: 'hidden', height: h, maxWidth: mw > 0 ? mw : undefined, margin: '0 auto',
        borderRadius: radius, display: 'flex', flexDirection: 'column', justifyContent: VA[valign] || 'center',
        alignItems: AL[align] || 'center', textAlign: (align === 'left' ? 'left' : align === 'right' ? 'right' : 'center') as CSSProperties['textAlign'],
      }}
    >
      {img ? (
        <img
          src={safeUrl(img)}
          alt={alt}
          loading={m ? 'lazy' : 'eager'}
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, objectPosition: POS[k('Pos')] || 'center' }}
        />
      ) : null}
      {ov > 0 ? <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${ov / 100})` }} /> : null}
      {title || sub || btn ? (
        <div style={{ position: 'relative', padding: m ? '16px 20px' : '24px 48px', maxWidth: '100%', boxSizing: 'border-box' }}>
          {title ? <h2 style={{ margin: 0, fontSize: tSize, lineHeight: 1.15, fontWeight: 700, color }}>{title}</h2> : null}
          {sub ? <p style={{ margin: '8px 0 0', fontSize: sSize, lineHeight: 1.4, color }}>{sub}</p> : null}
          {btn ? (
            <a
              href={link ? safeUrl(link) : '#'}
              style={{
                display: 'inline-block', marginTop: 16, padding: m ? '9px 18px' : '11px 24px', borderRadius: 8, fontWeight: 600,
                textDecoration: 'none', background: k('BtnBg') || '#ffffff', color: k('BtnColor') || '#111111', fontSize: m ? 14 : 16,
              }}
            >
              {btn}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={dev === 'd' ? 'sll-ban-d' : 'sll-ban-m'} style={{ background: k('Bg') || undefined, padding: `${pad}px 0` }}>
      {link && !btn ? <a href={safeUrl(link)} style={{ display: 'block' }}>{inner}</a> : inner}
    </div>
  );
}

type BanField = BlockDef['fields'][number];

const SIDE = [{ value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' }];
const VSIDE = [{ value: 'top', label: 'Topo' }, { value: 'center', label: 'Meio' }, { value: 'bottom', label: 'Base' }];
const IMGPOS = [
  { value: 'center', label: 'Centro' }, { value: 'top', label: 'Topo' }, { value: 'bottom', label: 'Base' },
  { value: 'left', label: 'Esquerda' }, { value: 'right', label: 'Direita' },
];

const banDev = (d: 'd' | 'm'): BanField[] => {
  const g = d === 'd' ? 'Desktop' : 'Celular';
  const h = d === 'm' ? ' (vazio = igual ao desktop)' : '';
  return [
    { key: d + 'Img', label: 'Imagem' + h, type: 'upload', accept: 'image', group: g },
    { key: d + 'Alt', label: 'Texto alternativo' + h, group: g },
    { key: d + 'Link', label: 'Link' + h, group: g },
    { key: d + 'Title', label: 'T\u00edtulo' + h, group: g },
    { key: d + 'TSize', label: 'Tamanho do t\u00edtulo (px)', type: 'number', min: 12, max: 96, group: g, def: d === 'd' ? '40' : '24' },
    { key: d + 'Sub', label: 'Subt\u00edtulo' + h, multiline: true, group: g },
    { key: d + 'SSize', label: 'Tamanho do subt\u00edtulo (px)', type: 'number', min: 10, max: 48, group: g, def: d === 'd' ? '18' : '14' },
    { key: d + 'Btn', label: 'Texto do bot\u00e3o' + h, group: g },
    { key: d + 'BtnBg', label: 'Cor do bot\u00e3o', type: 'color', group: g, def: '#ffffff' },
    { key: d + 'BtnColor', label: 'Cor do texto do bot\u00e3o', type: 'color', group: g, def: '#111111' },
    { key: d + 'Color', label: 'Cor do texto', type: 'color', group: g, def: '#ffffff' },
    { key: d + 'Align', label: 'Alinhamento horizontal', type: 'select', options: SIDE, group: g, def: d === 'd' ? 'left' : 'center' },
    { key: d + 'VAlign', label: 'Alinhamento vertical', type: 'select', options: VSIDE, group: g, def: 'center' },
    { key: d + 'H', label: 'Altura (px)', type: 'number', min: 80, max: 1000, group: g, def: d === 'd' ? '420' : '240' },
    { key: d + 'MaxW', label: 'Largura m\u00e1xima (px, 0 = total)', type: 'number', min: 0, max: 2400, group: g, def: '0' },
    {
      key: d + 'Fit', label: 'Ajuste da imagem', type: 'select', group: g, def: 'cover',
      options: [{ value: 'cover', label: 'Preencher (recorta)' }, { value: 'contain', label: 'Mostrar inteira' }],
    },
    { key: d + 'Pos', label: 'Posi\u00e7\u00e3o da imagem', type: 'select', options: IMGPOS, group: g, def: 'center' },
    { key: d + 'Overlay', label: 'Escurecer imagem (%)', type: 'number', min: 0, max: 90, group: g, def: '0' },
    { key: d + 'Radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: g, def: '0' },
    { key: d + 'Bg', label: 'Cor de fundo', type: 'color', group: g },
    { key: d + 'Pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: g, def: '0' },
  ];
};

export const BANNER: BlockDef = {
  label: 'Banner principal',
  defaults: {
    dImg: 'https://placehold.co/1600x600?text=Banner', dAlt: '', dLink: '',
    dTitle: 'T\u00edtulo do banner', dSub: 'Subt\u00edtulo do banner', dBtn: 'Saiba mais',
    dTSize: '40', dSSize: '18', dBtnBg: '#ffffff', dBtnColor: '#111111', dColor: '#ffffff',
    dAlign: 'left', dVAlign: 'center', dH: '420', dMaxW: '0', dFit: 'cover', dPos: 'center', dOverlay: '25', dRadius: '0', dPad: '0',
    mImg: '', mAlt: '', mLink: '', mTitle: '', mSub: '', mBtn: '',
    mTSize: '24', mSSize: '14', mBtnBg: '#ffffff', mBtnColor: '#111111', mColor: '#ffffff',
    mAlign: 'center', mVAlign: 'center', mH: '240', mMaxW: '0', mFit: 'cover', mPos: 'center', mOverlay: '25', mRadius: '0', mPad: '0',
  },
  fields: [...banDev('d'), ...banDev('m')],
  render: (p) => (
    <section>
      <style dangerouslySetInnerHTML={{ __html: BAN_CSS }} />
      <div className="sll-ban-c">
        <BannerDev p={p} dev="d" />
        <BannerDev p={p} dev="m" />
      </div>
    </section>
  ),
};
