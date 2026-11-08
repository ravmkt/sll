import type { CSSProperties } from 'react';
import type { BlockDef } from '../registry-extra';
import { num, safeUrl } from '../styleKit';

type Item = { src: string; srcM: string; alt: string; link: string; title: string; btn: string };

const BANS_CSS =
  '.sll-bns-c{container-type:inline-size}' +
  '.sll-bns-m{display:none}' +
  '@container (max-width:700px){.sll-bns-d{display:none}.sll-bns-m{display:block}}';

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const AL: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
const VA: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
const RATIO: Record<string, string | undefined> = {
  w31: '3 / 1', l169: '16 / 9', l43: '4 / 3', sq: '1 / 1', r34: '3 / 4', r916: '9 / 16', orig: undefined,
};

function parseBans(raw: string | undefined): Item[] {
  try {
    const a = JSON.parse(raw || '[]');
    if (!Array.isArray(a)) return [];
    return a
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        src: String(x.src || ''), srcM: String(x.srcM || ''), alt: String(x.alt || ''),
        link: String(x.link || ''), title: String(x.title || ''), btn: String(x.btn || ''),
      }));
  } catch {
    return [];
  }
}

function BansDev({ p, dev, list }: { p: Record<string, string>; dev: 'd' | 'm'; list: Item[] }) {
  const m = dev === 'm';
  const k = (s: string) => p[dev + s] ?? '';
  const count = clampN(Math.round(num(k('Count'), m ? 3 : 3)), 1, Math.min(3, list.length));
  const cols = clampN(Math.round(num(k('Cols'), m ? 1 : 3)), 1, count);
  const gap = clampN(num(k('Gap'), m ? 12 : 16), 0, 80);
  const side = clampN(num(k('Side'), 0), 0, 200);
  const pad = clampN(num(k('Pad'), 0), 0, 200);
  const mw = num(k('MaxW'), 0);
  const radius = clampN(num(k('Radius'), 8), 0, 60);
  const ov = clampN(num(k('Overlay'), 0), 0, 90);
  const shape = k('Shape') || 'l169';
  const ratio = shape === 'round' ? '1 / 1' : RATIO[shape];
  const fit = k('Fit') === 'contain' ? 'contain' : 'cover';
  const color = k('Color') || '#ffffff';
  const align = k('Align') || 'center';
  const valign = k('VAlign') || 'bottom';
  const tSize = clampN(num(k('TSize'), m ? 18 : 24), 10, 80);
  const showText = k('Text') !== '0';

  return (
    <div className={m ? 'sll-bns-m' : 'sll-bns-d'} style={{ background: k('Bg') || undefined, padding: `${pad}px ${side}px` }}>
      <div
        style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap,
          maxWidth: mw > 0 ? mw : undefined, margin: '0 auto',
        }}
      >
        {list.slice(0, count).map((it, i) => {
          const src = (m && it.srcM) || it.src;
          const hasText = showText && (it.title || it.btn);
          const link = it.link.trim();
          const box: CSSProperties = {
            position: 'relative', overflow: 'hidden', borderRadius: shape === 'round' ? '50%' : radius, aspectRatio: ratio, display: 'block', background: '#f3f4f6',
          };
          const inner = (
            <div style={box}>
              {src ? (
                <img
                  src={safeUrl(src)}
                  alt={it.alt}
                  loading={i === 0 && !m ? 'eager' : 'lazy'}
                  draggable={false}
                  style={
                    ratio
                      ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit }
                      : { display: 'block', width: '100%', height: 'auto' }
                  }
                />
              ) : null}
              {ov > 0 ? <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${ov / 100})` }} /> : null}
              {hasText ? (
                <div
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
                    padding: m ? 12 : 20, justifyContent: VA[valign] || 'flex-end', alignItems: AL[align] || 'center',
                    textAlign: (align === 'left' ? 'left' : align === 'right' ? 'right' : 'center') as CSSProperties['textAlign'],
                  }}
                >
                  {it.title ? <h3 style={{ margin: 0, fontSize: tSize, lineHeight: 1.15, fontWeight: 700, color }}>{it.title}</h3> : null}
                  {it.btn ? (
                    <a
                      href={link ? safeUrl(link) : '#'}
                      style={{
                        display: 'inline-block', marginTop: 10, padding: m ? '7px 14px' : '9px 20px', borderRadius: 8, fontWeight: 600,
                        textDecoration: 'none', fontSize: m ? 13 : 15, background: k('BtnBg') || '#ffffff', color: k('BtnColor') || '#111111',
                      }}
                    >
                      {it.btn}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
          return link && !it.btn ? (
            <a key={i} href={safeUrl(link)} style={{ display: 'block' }}>{inner}</a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

function BansView({ p }: { p: Record<string, string> }) {
  const list = parseBans(p.items).filter((x) => x.src || x.srcM);
  if (list.length === 0) {
    return <section style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>{'Adicione banners.'}</section>;
  }
  return (
    <section>
      <style dangerouslySetInnerHTML={{ __html: BANS_CSS }} />
      <div className="sll-bns-c">
        <BansDev p={p} dev="d" list={list} />
        <BansDev p={p} dev="m" list={list} />
      </div>
    </section>
  );
}

type BField = BlockDef['fields'][number];

const SIDE = [{ value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' }];
const VSIDE = [{ value: 'top', label: 'Topo' }, { value: 'center', label: 'Meio' }, { value: 'bottom', label: 'Base' }];
const SHAPES = [
  { value: 'w31', label: 'Panor\u00e2mico 3:1' },
  { value: 'l169', label: 'Paisagem 16:9' },
  { value: 'l43', label: 'Paisagem 4:3' },
  { value: 'sq', label: 'Quadrado' },
  { value: 'round', label: 'Redondo' },
  { value: 'r34', label: 'Retrato 3:4' },
  { value: 'r916', label: 'Retrato 9:16' },
  { value: 'orig', label: 'Original' },
];
const itemsCount = (p: Record<string, string>) => Math.max(1, Math.min(3, parseBans(p.items).filter((x) => x.src || x.srcM).length));

const bnsDev = (d: 'd' | 'm'): BField[] => {
  const g = d === 'd' ? 'Desktop' : 'Celular';
  return [
    { key: d + 'Count', label: 'Quantos banners exibir (1 a 3)', type: 'number', min: 1, max: 3, group: g, def: '3', maxFn: (p) => itemsCount(p) },
    { key: d + 'Cols', label: 'Banners por linha (1 a 3)', type: 'number', min: 1, max: 3, group: g, def: d === 'd' ? '3' : '1' },
    { key: d + 'Shape', label: 'Formato', type: 'select', options: SHAPES, group: g, def: 'l169' },
    {
      key: d + 'Fit', label: 'Ajuste da imagem', type: 'select', group: g, def: 'cover',
      options: [{ value: 'cover', label: 'Preencher (recorta)' }, { value: 'contain', label: 'Mostrar inteira' }],
    },
    { key: d + 'Gap', label: 'Espa\u00e7o entre banners (px)', type: 'number', min: 0, max: 80, group: g, def: d === 'd' ? '16' : '12' },
    { key: d + 'Side', label: 'Margem lateral (px)', type: 'number', min: 0, max: 200, group: g, def: '0' },
    { key: d + 'MaxW', label: 'Largura m\u00e1xima (px, 0 = total)', type: 'number', min: 0, max: 2400, group: g, def: '0' },
    { key: d + 'Radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: g, def: '8' },
    { key: d + 'Overlay', label: 'Escurecer imagem (%)', type: 'number', min: 0, max: 90, group: g, def: '20' },
    {
      key: d + 'Text', label: 'Mostrar t\u00edtulo e bot\u00e3o', type: 'select', group: g, def: '1',
      options: [{ value: '1', label: 'Sim' }, { value: '0', label: 'N\u00e3o' }],
    },
    { key: d + 'TSize', label: 'Tamanho do t\u00edtulo (px)', type: 'number', min: 10, max: 80, group: g, def: d === 'd' ? '24' : '18' },
    { key: d + 'Color', label: 'Cor do texto', type: 'color', group: g, def: '#ffffff' },
    { key: d + 'Align', label: 'Alinhamento horizontal', type: 'select', options: SIDE, group: g, def: 'center' },
    { key: d + 'VAlign', label: 'Alinhamento vertical', type: 'select', options: VSIDE, group: g, def: 'bottom' },
    { key: d + 'BtnBg', label: 'Cor do bot\u00e3o', type: 'color', group: g, def: '#ffffff' },
    { key: d + 'BtnColor', label: 'Cor do texto do bot\u00e3o', type: 'color', group: g, def: '#111111' },
    { key: d + 'Bg', label: 'Cor de fundo', type: 'color', group: g },
    { key: d + 'Pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: g, def: '0' },
  ];
};

export const BANNERS: BlockDef = {
  label: '1 a 3 banners',
  defaults: {
    items: JSON.stringify([
      { src: 'https://placehold.co/800x450?text=Banner+1', srcM: '', alt: '', link: '', title: 'Banner 1', btn: 'Ver mais' },
      { src: 'https://placehold.co/800x450?text=Banner+2', srcM: '', alt: '', link: '', title: 'Banner 2', btn: 'Ver mais' },
      { src: 'https://placehold.co/800x450?text=Banner+3', srcM: '', alt: '', link: '', title: 'Banner 3', btn: 'Ver mais' },
    ]),
    dCount: '3', dCols: '3', dShape: 'l169', dFit: 'cover', dGap: '16', dSide: '0', dMaxW: '0', dRadius: '8', dOverlay: '20',
    dText: '1', dTSize: '24', dColor: '#ffffff', dAlign: 'center', dVAlign: 'bottom', dBtnBg: '#ffffff', dBtnColor: '#111111', dPad: '0',
    mCount: '3', mCols: '1', mShape: 'l169', mFit: 'cover', mGap: '12', mSide: '0', mMaxW: '0', mRadius: '8', mOverlay: '20',
    mText: '1', mTSize: '18', mColor: '#ffffff', mAlign: 'center', mVAlign: 'bottom', mBtnBg: '#ffffff', mBtnColor: '#111111', mPad: '0',
  },
  fields: [
    {
      key: 'items',
      label: 'Banners',
      type: 'repeater',
      itemLabel: 'Banner',
      maxItems: 3,
      itemDefaults: { src: 'https://placehold.co/800x450', srcM: '', alt: '', link: '', title: '', btn: '' },
      item: [
        { key: 'src', label: 'Imagem', type: 'upload', accept: 'image' },
        { key: 'srcM', label: 'Imagem do celular (vazio = mesma)', type: 'upload', accept: 'image' },
        { key: 'alt', label: 'Texto alternativo' },
        { key: 'link', label: 'Link' },
        { key: 'title', label: 'T\u00edtulo' },
        { key: 'btn', label: 'Texto do bot\u00e3o' },
      ],
    },
    ...bnsDev('d'),
    ...bnsDev('m'),
  ],
  render: (p) => <BansView p={p} />,
};
