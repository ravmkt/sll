import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { CAROUSEL_JS } from './carouselJs';
import type { BlockType } from '../types';
import type { BlockDef } from '../registry-extra';
import { ALIGN_OPTIONS, num, parseItems, safeUrl, textCss, textFields } from '../styleKit';

const yesNo = (yes: string, no: string) => [
  { value: '0', label: no },
  { value: '1', label: yes },
];

const RATIOS = [
  { value: '16 / 9', label: '16:9 (horizontal)' },
  { value: '9 / 16', label: '9:16 (vertical)' },
  { value: '1 / 1', label: '1:1 (quadrado)' },
  { value: '4 / 3', label: '4:3' },
  { value: '21 / 9', label: '21:9 (panor\u00e2mico)' },
];

type Src = { kind: 'file' | 'yt' | 'vimeo' | 'panda' | 'other'; id: string; url: string; h?: string };
type Opt = { auto: boolean; mute: boolean; loop: boolean; ctl: boolean };

function parse(raw: string): Src {
  const ifr = raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const url = (ifr ? ifr[1] : raw).trim();
  if (/pandavideo\.com\.br/i.test(url)) return { kind: 'panda', id: '', url: safeUrl(url) };
  if (/\.(mp4|webm|ogg)($|\?)/i.test(url)) return { kind: 'file', id: '', url: safeUrl(url) };
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt) return { kind: 'yt', id: yt[1], url };
  const vm = url.match(/vimeo\.com\/(?:.*\/)?(\d+)(?:\/([a-f0-9]+))?/i);
  const vh = url.match(/[?&]h=([a-f0-9]+)/i);
  if (vm) return { kind: 'vimeo', id: vm[1], url, h: vm[2] || vh?.[1] };
  return { kind: 'other', id: '', url: safeUrl(url) };
}

function embed(s: Src, o: Opt): string {
  if (s.kind === 'yt') {
    const q = new URLSearchParams({ playsinline: '1', rel: '0' });
    if (o.auto) q.set('autoplay', '1');
    if (o.mute) q.set('mute', '1');
    if (o.loop) { q.set('loop', '1'); q.set('playlist', s.id); }
    if (!o.ctl) q.set('controls', '0');
    return `https://www.youtube.com/embed/${s.id}?${q.toString()}`;
  }
  if (s.kind === 'vimeo') {
    const q = new URLSearchParams();
    if (s.h) q.set('h', s.h);
    if (o.auto) q.set('autoplay', '1');
    if (o.mute) q.set('muted', '1');
    if (o.loop) q.set('loop', '1');
    if (!o.ctl) q.set('controls', '0');
    const qs = q.toString();
    return `https://player.vimeo.com/video/${s.id}${qs ? `?${qs}` : ''}`;
  }
  if (s.kind === 'panda') {
    try {
      const u = new URL(s.url);
      if (o.auto) u.searchParams.set('autoplay', 'true');
      if (o.mute) u.searchParams.set('muted', 'true');
      if (o.loop) u.searchParams.set('loop', 'true');
      return u.toString();
    } catch {
      return s.url;
    }
  }
  return s.url;
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function coverDoc(cover: string, href: string): string {
  return (
    '<style>*{margin:0;padding:0}html,body{height:100%;background:#000}' +
    'a{display:block;height:100%;position:relative;cursor:pointer}' +
    'img{width:100%;height:100%;object-fit:cover;display:block}' +
    'span{position:absolute;left:50%;top:50%;width:68px;height:68px;margin:-34px 0 0 -34px;border-radius:50%;background:rgba(0,0,0,.65)}' +
    'span:after{content:"";position:absolute;left:27px;top:20px;border-left:22px solid #fff;border-top:14px solid transparent;border-bottom:14px solid transparent}</style>' +
    `<a href="${esc(href)}" target="_self"><img src="${esc(cover)}" alt=""><span></span></a>`
  );
}

const CAR_CSS =
  '.sll-car-vp{overflow:hidden}' +
  '.sll-car-tr{display:flex;touch-action:pan-y;user-select:none;-webkit-user-select:none;will-change:transform}' +
  '.sll-car-s{flex:0 0 calc(100% / var(--v));min-width:0;box-sizing:border-box}' +
  '.sll-car{--v:var(--vd)}@media(max-width:700px){.sll-car{--v:var(--vm)}}';

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const imgCount = (p: Record<string, string>) => Math.max(1, parseItems(p.items).filter((x) => x.src).length);

function CarouselView({ p }: { p: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const list = parseItems(p.items).filter((x) => x.src);
  const n = list.length;
  const sig = JSON.stringify(p);

  useEffect(() => {
    const el = ref.current;
    if (!el || n < 2) return undefined;
    const make = new Function('return ' + CAROUSEL_JS)() as (r: HTMLElement) => () => void;
    return make(el);
  }, [sig, n]);

  if (n === 0) {
    return <section style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>{'Adicione imagens ao carrossel.'}</section>;
  }

  const dv = clampN(Math.round(num(p.dView, 1)), 1, n);
  const mv = clampN(Math.round(num(p.mView, 1)), 1, Math.min(2, n));
  const dm = p.dMode || p.mode || 'auto';
  const mm = p.mMode || p.mode || 'auto';
  const sec = clampN(num(p.secs, 4), 1, 30);
  const gap = clampN(num(p.gap, 12), 0, 80);
  const mw = num(p.maxW, 1200);
  const ratio = p.ratio && p.ratio !== 'auto' ? p.ratio : undefined;
  const fit = p.fit === 'contain' ? 'contain' : 'cover';
  const rootStyle = {
    maxWidth: mw > 0 ? mw : undefined,
    margin: '0 auto',
    overflow: 'hidden',
    '--vd': dv,
    '--vm': mv,
  } as CSSProperties;

  return (
    <section style={{ background: p.bg || undefined, padding: `${num(p.pad, 16)}px 32px` }}>
      <style dangerouslySetInnerHTML={{ __html: CAR_CSS }} />
      <div
        key={sig}
        ref={ref}
        className="sll-car"
        data-car=""
        data-dm={dm}
        data-mm={mm}
        data-dv={dv}
        data-mv={mv}
        data-secs={sec}
        style={rootStyle}
      >
        <div className="sll-car-vp" style={{ margin: `0 -${gap / 2}px` }}>
          <div className="sll-car-tr" data-car-tr="" style={{ cursor: n > 1 ? 'grab' : undefined }}>
            {list.map((it, i) => {
              const im = (
                <img
                  src={safeUrl(it.src)}
                  alt={it.alt || ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  style={{ width: '100%', display: 'block', aspectRatio: ratio, objectFit: fit, borderRadius: num(p.radius, 8) }}
                />
              );
              const href = (it.href || '').trim();
              return (
                <div key={i} className="sll-car-s" style={{ padding: `0 ${gap / 2}px` }}>
                  {href ? <a href={safeUrl(href)} draggable={false} style={{ display: 'block' }}>{im}</a> : im}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const CAR_MODES = [
  { value: 'auto', label: 'Autom\u00e1tica (infinita)' },
  { value: 'manual', label: 'Manual: arrastar (infinita)' },
];

const CAROUSEL: BlockDef = {
  label: 'Carrossel de imagens',
  defaults: {
    items: JSON.stringify([
      { src: 'https://placehold.co/1200x500?text=Imagem+1', alt: '', href: '' },
      { src: 'https://placehold.co/1200x500?text=Imagem+2', alt: '', href: '' },
      { src: 'https://placehold.co/1200x500?text=Imagem+3', alt: '', href: '' },
    ]),
    dMode: 'auto',
    mMode: 'auto',
    dView: '1',
    mView: '1',
    secs: '4',
    ratio: '16 / 9',
    fit: 'cover',
    gap: '12',
    maxW: '1200',
    radius: '8',
    pad: '16',
    bg: '',
  },
  fields: [
    {
      key: 'items',
      label: 'Imagens',
      type: 'repeater',
      itemLabel: 'Imagem',
      maxItems: 12,
      itemDefaults: { src: 'https://placehold.co/1200x500', alt: '', href: '' },
      item: [
        { key: 'src', label: 'Imagem', type: 'upload', accept: 'image' },
        { key: 'alt', label: 'Texto alternativo' },
        { key: 'href', label: 'Link (opcional)' },
      ],
    },
    { key: 'dMode', label: 'Troca no desktop', type: 'select', options: CAR_MODES, group: 'Desktop', def: 'auto' },
    { key: 'dView', label: 'Imagens vis\u00edveis (m\u00e1x. = qtd. de imagens)', type: 'number', min: 1, max: 12, maxFn: imgCount, group: 'Desktop', def: '1' },
    { key: 'mMode', label: 'Troca no celular', type: 'select', options: CAR_MODES, group: 'Celular', def: 'auto' },
    { key: 'mView', label: 'Imagens vis\u00edveis (m\u00e1x. 2)', type: 'number', min: 1, max: 2, maxFn: (p) => Math.min(2, imgCount(p)), group: 'Celular', def: '1' },
    { key: 'secs', label: 'Segundos por troca (autom\u00e1tico)', type: 'number', min: 1, max: 30, group: 'Imagens', def: '4' },
    { key: 'ratio', label: 'Propor\u00e7\u00e3o', type: 'select', group: 'Imagens', def: '16 / 9', options: [{ value: 'auto', label: 'Original' }, ...RATIOS] },
    {
      key: 'fit', label: 'Ajuste da imagem', type: 'select', group: 'Imagens', def: 'cover',
      options: [{ value: 'cover', label: 'Preencher (recorta)' }, { value: 'contain', label: 'Mostrar inteira' }],
    },
    { key: 'gap', label: 'Espa\u00e7o entre imagens (px)', type: 'number', min: 0, max: 80, group: 'Imagens', def: '12' },
    { key: 'radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Imagens', def: '8' },
    { key: 'maxW', label: 'Largura m\u00e1xima (px, 0 = total)', type: 'number', min: 0, max: 2400, group: 'Layout', def: '1200' },
    { key: 'bg', label: 'Cor de fundo da se\u00e7\u00e3o', type: 'color', group: 'Layout' },
    { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: 'Layout', def: '16' },
  ],
  render: (p) => <CarouselView p={p} />,
};
export const MEDIA_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
  carousel: CAROUSEL,
  video: {
    label: 'V\u00eddeo',
    defaults: {
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      title: '',
      cover: '',
      autoplay: '0',
      loop: '0',
      controls: '1',
      ratio: '16 / 9',
      maxW: '900',
      radius: '8',
      pad: '32',
      align: 'center',
      bg: '',
    },
    fields: [
      { key: 'url', label: 'Link, c\u00f3digo ou arquivo MP4 (YouTube, Vimeo, Panda)', type: 'upload', accept: 'video' },
      { key: 'title', label: 'T\u00edtulo (opcional)' },
      { key: 'cover', label: 'Imagem de capa (opcional)', type: 'upload', accept: 'image' },
      ...textFields('title', 'T\u00edtulo', 60, { size: '24', color: '#111827', style: 'bold' }),
      { key: 'autoplay', label: 'Iniciar sozinho (sem som)', type: 'select', options: yesNo('Sim', 'N\u00e3o'), group: 'Reprodu\u00e7\u00e3o', def: '0' },
      { key: 'loop', label: 'Repetir', type: 'select', options: yesNo('Sim', 'N\u00e3o'), group: 'Reprodu\u00e7\u00e3o', def: '0' },
      { key: 'controls', label: 'Mostrar controles', type: 'select', options: yesNo('Sim', 'N\u00e3o'), group: 'Reprodu\u00e7\u00e3o', def: '1' },
      { key: 'ratio', label: 'Propor\u00e7\u00e3o', type: 'select', options: RATIOS, group: 'Layout', def: '16 / 9' },
      { key: 'maxW', label: 'Largura m\u00e1xima (px)', type: 'number', min: 120, max: 1600, group: 'Layout', def: '900' },
      { key: 'radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Layout', def: '8' },
      { key: 'align', label: 'Alinhamento', type: 'select', options: ALIGN_OPTIONS, group: 'Layout', def: 'center' },
      { key: 'bg', label: 'Cor de fundo da se\u00e7\u00e3o', type: 'color', group: 'Layout' },
      { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: 'Layout', def: '32' },
    ],
    render: (p) => {
      const s = parse(p.url || '');
      const auto = p.autoplay === '1';
      const loop = p.loop === '1';
      const ctl = p.controls !== '0';
      const cover = p.cover ? safeUrl(p.cover) : '';
      const al = p.align || 'center';
      const media: CSSProperties = {
        width: '100%',
        display: 'block',
        border: 0,
        background: '#000',
        borderRadius: num(p.radius, 8),
        aspectRatio: p.ratio || '16 / 9',
      };
      const allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      let el;
      if (s.kind === 'file') {
        el = (
          <video
            src={s.url}
            poster={cover || undefined}
            controls={ctl}
            autoPlay={auto}
            muted={auto}
            loop={loop}
            playsInline
            preload="metadata"
            style={{ ...media, objectFit: 'contain' }}
          />
        );
      } else if (cover) {
        const href = embed(s, { auto: true, mute: false, loop, ctl });
        el = <iframe srcDoc={coverDoc(cover, href)} allow={allow} allowFullScreen loading="lazy" title={'V\u00eddeo'} style={media} />;
      } else {
        el = <iframe src={embed(s, { auto, mute: auto, loop, ctl })} allow={allow} allowFullScreen loading="lazy" title={'V\u00eddeo'} style={media} />;
      }
      return (
        <section style={{ background: p.bg || undefined, padding: `${num(p.pad, 32)}px 32px` }}>
          <div
            style={{
              maxWidth: num(p.maxW, 900),
              margin: al === 'left' ? '0' : al === 'right' ? '0 0 0 auto' : '0 auto',
            }}
          >
            {p.title ? (
              <h2
                style={{
                  margin: '0 0 16px',
                  textAlign: al as CSSProperties['textAlign'],
                  ...textCss(p, 'title', { size: 24, color: '#111827', style: 'bold' }),
                }}
              >
                {p.title}
              </h2>
            ) : null}
            {el}
          </div>
        </section>
      );
    },
  },
};