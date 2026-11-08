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
  '.sll-car-c{container-type:inline-size}' +
  '.sll-car-m{display:none}' +
  '@container (max-width:700px){.sll-car-d{display:none}.sll-car-m{display:block}}' +
  '.sll-car-vp{overflow:hidden}' +
  '.sll-car-tr{display:flex;touch-action:pan-y;user-select:none;-webkit-user-select:none;will-change:transform}' +
  '.sll-car-s{flex:0 0 calc(100% / var(--v));min-width:0;box-sizing:border-box}';

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const imgCount = (p: Record<string, string>) => Math.max(1, parseItems(p.items).filter((x) => x.src).length);

const SHAPE_RATIO: Record<string, string | undefined> = {
  r916: '9 / 16', r34: '3 / 4', l169: '16 / 9', l43: '4 / 3', sq: '1 / 1', round: '1 / 1', orig: undefined,
};

function CarInst({ p, dev, list }: { p: Record<string, string>; dev: 'd' | 'm'; list: ReturnType<typeof parseItems> }) {
  const ref = useRef<HTMLDivElement>(null);
  const k = (s: string) => p[dev + s];
  const n0 = list.length;
  const rep = k('Repeat') === '1';
  const cap = dev === 'm' ? 2 : 12;
  const v = clampN(Math.round(num(k('View'), dev === 'm' ? 2 : 1)), 1, Math.min(cap, n0));
  const eff = n0;
  const items = list;
  const card = clampN(Math.round(num(k('Card'), dev === 'm' ? 150 : 220)), 40, 1200);
  const sh = k('Shape') || (p.ratio === 'auto' ? 'orig' : dev === 'd' ? 'l169' : 'sq');
  const ratio = SHAPE_RATIO[sh];
  const size = clampN(Math.round(num(k('Size'), 100)), 10, 100);
  const gap = clampN(num(k('Gap') ?? p.gap, dev === 'd' ? 12 : 8), 0, 80);
  const mw = num(k('MaxW') ?? p.maxW, dev === 'd' ? 1200 : 0);
  const mode = k('Mode') || p.mode || 'auto';
  const sec = clampN(num(p.secs, 4), 1, 30);
  const fit = p.fit === 'contain' ? 'contain' : 'cover';
  const radius = sh === 'round' ? '50%' : `${num(p.radius, 8)}px`;
  const sig = JSON.stringify(p);

  useEffect(() => {
    const el = ref.current;
    if (!el || (eff < 2 && !rep)) return undefined;
    const make = new Function('return ' + CAROUSEL_JS)() as (r: HTMLElement) => () => void;
    return make(el);
  }, [sig, eff]);

  return (
    <div
      ref={ref}
      className={dev === 'd' ? 'sll-car-d' : 'sll-car-m'}
      data-car=""
      data-mode={mode}
      data-secs={sec}
      data-card={rep ? card : 0}
      style={{ maxWidth: mw > 0 ? mw : undefined, margin: '0 auto', overflow: 'hidden', '--v': v } as CSSProperties}
    >
      <div className="sll-car-vp" style={{ margin: `0 -${gap / 2}px` }}>
        <div className="sll-car-tr" data-car-tr="" style={{ cursor: eff > 1 ? 'grab' : undefined }}>
          {items.map((it, i) => {
            const im = (
              <img
                src={safeUrl(it.src)}
                alt={it.alt || ''}
                loading={dev === 'd' && i === 0 ? 'eager' : 'lazy'}
                draggable={false}
                style={{ display: 'block', width: `${size}%`, margin: '0 auto', aspectRatio: ratio, objectFit: fit, borderRadius: radius }}
              />
            );
            const href = (it.href || '').trim();
            return (
              <div key={i} className="sll-car-s" style={{ padding: `0 ${gap / 2}px`, flex: rep ? `0 0 ${card}px` : undefined }}>
                {href ? <a href={safeUrl(href)} draggable={false} style={{ display: 'block' }}>{im}</a> : im}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CarouselView({ p }: { p: Record<string, string> }) {
  const list = parseItems(p.items).filter((x) => x.src);
  if (list.length === 0) {
    return <section style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>{'Adicione imagens ao carrossel.'}</section>;
  }
  const sig = JSON.stringify(p);
  return (
    <section style={{ background: p.bg || undefined, padding: `${num(p.pad, 16)}px 32px` }}>
      <style dangerouslySetInnerHTML={{ __html: CAR_CSS }} />
      <div className="sll-car-c">
        <CarInst key={sig + 'd'} p={p} dev="d" list={list} />
        <CarInst key={sig + 'm'} p={p} dev="m" list={list} />
      </div>
    </section>
  );
}

const CAR_MODES = [
  { value: 'auto', label: 'Autom\u00e1tica (infinita)' },
  { value: 'manual', label: 'Manual: arrastar (infinita)' },
];

const SHAPE_OPTS = [
  { value: 'r916', label: 'Retrato 9:16' },
  { value: 'r34', label: 'Retrato 3:4' },
  { value: 'l169', label: 'Paisagem 16:9' },
  { value: 'l43', label: 'Paisagem 4:3' },
  { value: 'sq', label: 'Quadrado' },
  { value: 'round', label: 'Redondo' },
  { value: 'orig', label: 'Original' },
];

type CarField = BlockDef['fields'][number];

const carDev = (d: 'd' | 'm'): CarField[] => {
  const g = d === 'd' ? 'Desktop' : 'Celular';
  const cap = d === 'd' ? 12 : 2;
  return [
    { key: d + 'Mode', label: 'Troca', type: 'select', options: CAR_MODES, group: g, def: 'auto' },
    {
      key: d + 'View', label: 'Imagens vis\u00edveis', type: 'number', min: 1, max: cap, group: g, def: d === 'd' ? '1' : '2',
      maxFn: (p) => Math.min(cap, imgCount(p)),
    },
    {
      key: d + 'Repeat', label: 'Repetir para preencher a largura (ignora imagens vis\u00edveis)', type: 'select', group: g, def: '0',
      options: [{ value: '0', label: 'N\u00e3o' }, { value: '1', label: 'Sim' }],
    },
    { key: d + 'Card', label: 'Largura do card ao repetir (px)', type: 'number', min: 40, max: 1200, group: g, def: d === 'd' ? '220' : '150' },
    { key: d + 'Shape', label: 'Formato', type: 'select', options: SHAPE_OPTS, group: g, def: d === 'd' ? 'l169' : 'sq' },
    { key: d + 'Size', label: 'Tamanho da imagem (% da coluna)', type: 'number', min: 10, max: 100, group: g, def: '100' },
    { key: d + 'Gap', label: 'Espa\u00e7o entre imagens (px)', type: 'number', min: 0, max: 80, group: g, def: d === 'd' ? '12' : '8' },
    { key: d + 'MaxW', label: 'Largura m\u00e1xima (px, 0 = total)', type: 'number', min: 0, max: 2400, group: g, def: d === 'd' ? '1200' : '0' },
  ];
};

const CAROUSEL: BlockDef = {
  label: 'Carrossel de imagens',
  defaults: {
    items: JSON.stringify([
      { src: 'https://placehold.co/1200x500?text=Imagem+1', alt: '', href: '' },
      { src: 'https://placehold.co/1200x500?text=Imagem+2', alt: '', href: '' },
      { src: 'https://placehold.co/1200x500?text=Imagem+3', alt: '', href: '' },
    ]),
    dMode: 'auto', dView: '1', dRepeat: '0', dCard: '220', mCard: '150', dShape: 'l169', dSize: '100', dGap: '12', dMaxW: '1200',
    mMode: 'auto', mView: '2', mRepeat: '0', mShape: 'sq', mSize: '100', mGap: '8', mMaxW: '0',
    secs: '4',
    fit: 'cover',
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
    ...carDev('d'),
    ...carDev('m'),
    { key: 'secs', label: 'Segundos por troca (autom\u00e1tico)', type: 'number', min: 1, max: 30, group: 'Geral', def: '4' },
    {
      key: 'fit', label: 'Ajuste da imagem', type: 'select', group: 'Geral', def: 'cover',
      options: [{ value: 'cover', label: 'Preencher (recorta)' }, { value: 'contain', label: 'Mostrar inteira' }],
    },
    { key: 'radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Geral', def: '8' },
    { key: 'bg', label: 'Cor de fundo da se\u00e7\u00e3o', type: 'color', group: 'Geral' },
    { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: 'Geral', def: '16' },
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