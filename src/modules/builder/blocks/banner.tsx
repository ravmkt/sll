import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { BlockDef } from '../registry-extra';
import { num, safeUrl } from '../styleKit';

const BAN_CSS =
  '.sll-ban-c{container-type:inline-size}' +
  '.sll-ban-m{display:none}' +
  '@container (max-width:700px){.sll-ban-d{display:none}.sll-ban-m{display:block}}' +
  '.sll-bs-s{opacity:0;transition:opacity .6s ease;pointer-events:none}' +
  '.sll-bs-s[data-on="1"]{opacity:1;pointer-events:auto;z-index:1}' +
  '.sll-bs-dot{width:9px;height:9px;border-radius:50%;border:0;padding:0;background:#fff;opacity:.5;cursor:pointer;box-shadow:0 0 2px rgba(0,0,0,.5)}' +
  '.sll-bs-dot[data-on="1"]{opacity:1}';

export const BAN_JS = `(function(root){
if(root.getAttribute('data-bs-init'))return function(){};
var sl=[].slice.call(root.querySelectorAll('[data-bs-s]')),dots=[].slice.call(root.querySelectorAll('[data-bs-dot]')),n=sl.length;
if(n<2)return function(){};
root.setAttribute('data-bs-init','1');
var secs=Math.max(1,+root.getAttribute('data-secs')||5),auto=root.getAttribute('data-mode')!=='manual';
var rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var i=0,timer=0,hover=0,sx=null,moved=0;
function mark(a,j){a.forEach(function(s,x){if(x===j)s.setAttribute('data-on','1');else s.removeAttribute('data-on')})}
function show(k){i=((k%n)+n)%n;mark(sl,i);mark(dots,i)}
function stop(){clearInterval(timer);timer=0}
function start(){stop();if(auto&&!rm)timer=setInterval(function(){if(!hover&&!sx&&!document.hidden)show(i+1)},secs*1000)}
function dn(e){if(e.pointerType==='mouse'&&e.button!==0)return;sx={x:e.clientX,id:e.pointerId}}
function up(e){if(!sx||e.pointerId!==sx.id)return;var dx=e.clientX-sx.x;sx=null;if(Math.abs(dx)>40){moved=1;setTimeout(function(){moved=0},0);show(dx<0?i+1:i-1);start()}}
function cn(){sx=null}
function ck(e){if(moved){e.preventDefault();e.stopPropagation();return}var d=e.target.closest&&e.target.closest('[data-bs-dot]');if(d){show(+d.getAttribute('data-bs-dot'));start()}}
function en(e){if(e.pointerType==='mouse')hover=1}
function lv(e){if(e.pointerType==='mouse')hover=0}
root.addEventListener('pointerdown',dn);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cn);
root.addEventListener('click',ck,true);root.addEventListener('pointerenter',en);root.addEventListener('pointerleave',lv);
show(0);start();
return function(){
stop();
root.removeEventListener('pointerdown',dn);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cn);
root.removeEventListener('click',ck,true);root.removeEventListener('pointerenter',en);root.removeEventListener('pointerleave',lv);
root.removeAttribute('data-bs-init');
};
})`;

const STATIC_JS = '(function(){var s=document.currentScript,r=s&&s.previousElementSibling;if(r)' + BAN_JS + '(r)})();';

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const AL: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
const VA: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
const POS: Record<string, string> = { center: 'center', top: 'center top', bottom: 'center bottom', left: 'left center', right: 'right center' };

type Slide = { img: string; alt: string; link: string; title: string; sub: string; btn: string };
type Extra = { img: string; imgM: string; alt: string; link: string; title: string; sub: string; btn: string };

function parseExtra(raw: string | undefined): Extra[] {
  try {
    const a = JSON.parse(raw || '[]');
    if (!Array.isArray(a)) return [];
    return a
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        img: String(x.img || ''), imgM: String(x.imgM || ''), alt: String(x.alt || ''), link: String(x.link || ''),
        title: String(x.title || ''), sub: String(x.sub || ''), btn: String(x.btn || ''),
      }));
  } catch {
    return [];
  }
}

function BannerDev({ p, dev }: { p: Record<string, string>; dev: 'd' | 'm' }) {
  const ref = useRef<HTMLDivElement>(null);
  const m = dev === 'm';
  const k = (s: string) => p[dev + s] ?? '';

  const legacy: Slide = { img: p.dImg ?? '', alt: p.dAlt ?? '', link: (p.dLink ?? '').trim(), title: p.dTitle ?? '', sub: p.dSub ?? '', btn: p.dBtn ?? '' };
  const list: Slide[] = parseExtra(p.slides)
    .slice(0, 5)
    .map((x) => ({ img: (m && x.imgM) || x.img, alt: x.alt, link: x.link.trim(), title: x.title, sub: x.sub, btn: x.btn }))
    .filter((s) => s.img || s.title || s.btn);
  const slides = list.length ? list : [legacy].filter((s) => s.img || s.title || s.btn);
  const multi = slides.length > 1;

  const h = clampN(num(k('H'), m ? 240 : 420), 80, 1000);
  const mw = num(k('MaxW'), 0);
  const round = k('Shape') === 'round';
  const radius = clampN(num(k('Radius'), 0), 0, 60);
  const pad = clampN(num(k('Pad'), 0), 0, 200);
  const ov = clampN(num(k('Overlay'), 0), 0, 90);
  const color = k('Color') || '#ffffff';
  const align = k('Align') || 'center';
  const valign = k('VAlign') || 'center';
  const tSize = clampN(num(k('TSize'), m ? 24 : 40), 12, 96);
  const sSize = clampN(num(k('SSize'), m ? 14 : 18), 10, 48);
  const fit = k('Fit') === 'contain' ? 'contain' : 'cover';
  const mode = k('Mode') === 'manual' ? 'manual' : 'auto';
  const secs = clampN(num(k('Secs'), 5), 1, 30);
  const dots = k('Dots') !== '0';
  const ta = (align === 'left' ? 'left' : align === 'right' ? 'right' : 'center') as CSSProperties['textAlign'];
  const sig = JSON.stringify(p);

  useEffect(() => {
    const el = ref.current;
    if (!el || !multi) return undefined;
    const make = new Function('return ' + BAN_JS)() as (r: HTMLElement) => () => void;
    return make(el);
  }, [sig, multi]);

  const rootStyle: CSSProperties = round
    ? { width: `min(${mw > 0 ? Math.min(h, mw) : h}px, 100%)`, aspectRatio: '1 / 1' }
    : { height: h, maxWidth: mw > 0 ? mw : undefined };

  const slideStyle: CSSProperties = {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
    justifyContent: VA[valign] || 'center', alignItems: AL[align] || 'center', textAlign: ta, textDecoration: 'none',
  };

  return (
    <div className={m ? 'sll-ban-m' : 'sll-ban-d'} style={{ background: k('Bg') || undefined, padding: `${pad}px 0` }}>
      <div
        ref={ref}
        data-bs=""
        data-mode={mode}
        data-secs={secs}
        style={{ position: 'relative', overflow: 'hidden', margin: '0 auto', borderRadius: round ? '50%' : radius, touchAction: 'pan-y', ...rootStyle }}
      >
        {slides.map((s, j) => {
          const content = (
            <>
              {s.img ? (
                <img
                  src={safeUrl(s.img)}
                  alt={s.alt}
                  loading={j === 0 && !m ? 'eager' : 'lazy'}
                  draggable={false}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, objectPosition: POS[k('Pos')] || 'center' }}
                />
              ) : null}
              {ov > 0 ? <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${ov / 100})` }} /> : null}
              {s.title || s.sub || s.btn ? (
                <div style={{ position: 'relative', padding: round ? '16px 14%' : m ? '16px 20px' : '24px 48px', maxWidth: '100%', boxSizing: 'border-box' }}>
                  {s.title ? <h2 style={{ margin: 0, fontSize: tSize, lineHeight: 1.15, fontWeight: 700, color }}>{s.title}</h2> : null}
                  {s.sub ? <p style={{ margin: '8px 0 0', fontSize: sSize, lineHeight: 1.4, color }}>{s.sub}</p> : null}
                  {s.btn ? (
                    <a
                      href={s.link ? safeUrl(s.link) : '#'}
                      style={{
                        display: 'inline-block', marginTop: 16, padding: m ? '9px 18px' : '11px 24px', borderRadius: 8, fontWeight: 600,
                        textDecoration: 'none', background: k('BtnBg') || '#ffffff', color: k('BtnColor') || '#111111', fontSize: m ? 14 : 16,
                      }}
                    >
                      {s.btn}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </>
          );
          return s.link && !s.btn ? (
            <a key={j} className="sll-bs-s" data-bs-s="" data-on={j === 0 ? '1' : undefined} href={safeUrl(s.link)} style={slideStyle}>{content}</a>
          ) : (
            <div key={j} className="sll-bs-s" data-bs-s="" data-on={j === 0 ? '1' : undefined} style={slideStyle}>{content}</div>
          );
        })}
        {multi && dots ? (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: round ? '9%' : 12, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 2 }}>
            {slides.map((_, j) => (
              <button key={j} type="button" className="sll-bs-dot" data-bs-dot={j} data-on={j === 0 ? '1' : undefined} aria-label={`Slide ${j + 1}`} />
            ))}
          </div>
        ) : null}
      </div>
      {multi ? <script dangerouslySetInnerHTML={{ __html: STATIC_JS }} /> : null}
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
  return [
    { key: d + 'TSize', label: 'Tamanho do t\u00edtulo (px)', type: 'number', min: 12, max: 96, group: g, def: d === 'd' ? '40' : '24' },
    { key: d + 'SSize', label: 'Tamanho do subt\u00edtulo (px)', type: 'number', min: 10, max: 48, group: g, def: d === 'd' ? '18' : '14' },
    { key: d + 'BtnBg', label: 'Cor do bot\u00e3o', type: 'color', group: g, def: '#ffffff' },
    { key: d + 'BtnColor', label: 'Cor do texto do bot\u00e3o', type: 'color', group: g, def: '#111111' },
    { key: d + 'Color', label: 'Cor do texto', type: 'color', group: g, def: '#ffffff' },
    { key: d + 'Align', label: 'Alinhamento horizontal', type: 'select', options: SIDE, group: g, def: d === 'd' ? 'left' : 'center' },
    { key: d + 'VAlign', label: 'Alinhamento vertical', type: 'select', options: VSIDE, group: g, def: 'center' },
    {
      key: d + 'Shape', label: 'Formato', type: 'select', group: g, def: 'rect',
      options: [{ value: 'rect', label: 'Retangular (usa a altura)' }, { value: 'round', label: 'Redondo' }],
    },
    { key: d + 'H', label: 'Altura / di\u00e2metro (px)', type: 'number', min: 80, max: 1000, group: g, def: d === 'd' ? '420' : '240' },
    { key: d + 'MaxW', label: 'Largura m\u00e1xima (px, 0 = total)', type: 'number', min: 0, max: 2400, group: g, def: '0' },
    {
      key: d + 'Fit', label: 'Ajuste da imagem', type: 'select', group: g, def: 'cover',
      options: [{ value: 'cover', label: 'Preencher (recorta)' }, { value: 'contain', label: 'Mostrar inteira' }],
    },
    { key: d + 'Pos', label: 'Posi\u00e7\u00e3o da imagem', type: 'select', options: IMGPOS, group: g, def: 'center' },
    { key: d + 'Overlay', label: 'Escurecer imagem (%)', type: 'number', min: 0, max: 90, group: g, def: '0' },
    { key: d + 'Radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: g, def: '0' },
    {
      key: d + 'Mode', label: 'Troca de slides', type: 'select', group: g, def: 'auto',
      options: [{ value: 'auto', label: 'Autom\u00e1tica' }, { value: 'manual', label: 'Manual (arrastar ou bolinhas)' }],
    },
    { key: d + 'Secs', label: 'Segundos por slide', type: 'number', min: 1, max: 30, group: g, def: '5' },
    {
      key: d + 'Dots', label: 'Mostrar bolinhas', type: 'select', group: g, def: '1',
      options: [{ value: '1', label: 'Sim' }, { value: '0', label: 'N\u00e3o' }],
    },
    { key: d + 'Bg', label: 'Cor de fundo', type: 'color', group: g },
    { key: d + 'Pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: g, def: '0' },
  ];
};

export const BANNER: BlockDef = {
  label: 'Banner principal',
  defaults: {
    slides: JSON.stringify([
      { img: 'https://placehold.co/1600x600?text=Banner', imgM: '', alt: '', link: '', title: 'T\u00edtulo do banner', sub: 'Subt\u00edtulo do banner', btn: 'Saiba mais' },
    ]),
    dTSize: '40', dSSize: '18', dBtnBg: '#ffffff', dBtnColor: '#111111', dColor: '#ffffff',
    dAlign: 'left', dVAlign: 'center', dShape: 'rect', dH: '420', dMaxW: '0', dFit: 'cover', dPos: 'center', dOverlay: '25', dRadius: '0',
    dMode: 'auto', dSecs: '5', dDots: '1', dPad: '0',
    mTSize: '24', mSSize: '14', mBtnBg: '#ffffff', mBtnColor: '#111111', mColor: '#ffffff',
    mAlign: 'center', mVAlign: 'center', mShape: 'rect', mH: '240', mMaxW: '0', mFit: 'cover', mPos: 'center', mOverlay: '25', mRadius: '0',
    mMode: 'auto', mSecs: '5', mDots: '1', mPad: '0',
  },
  fields: [
    {
      key: 'slides',
      label: 'Slides (at\u00e9 5)',
      group: 'Slides',
      type: 'repeater',
      itemLabel: 'Slide',
      maxItems: 5,
      itemDefaults: { img: 'https://placehold.co/1600x600?text=Slide', imgM: '', alt: '', link: '', title: '', sub: '', btn: '' },
      item: [
        { key: 'img', label: 'Imagem', type: 'upload', accept: 'image' },
        { key: 'imgM', label: 'Imagem do celular (vazio = mesma)', type: 'upload', accept: 'image' },
        { key: 'alt', label: 'Texto alternativo' },
        { key: 'link', label: 'Link' },
        { key: 'title', label: 'T\u00edtulo' },
        { key: 'sub', label: 'Subt\u00edtulo', multiline: true },
        { key: 'btn', label: 'Texto do bot\u00e3o' },
      ],
    },
    ...banDev('d'),
    ...banDev('m'),
  ],
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
