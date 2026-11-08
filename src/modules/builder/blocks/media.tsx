import type { CSSProperties } from 'react';
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

const CAROUSEL: BlockDef = {
  label: 'Carrossel de imagens',
  defaults: {
    items: JSON.stringify([
      { src: 'https://placehold.co/1200x500?text=Imagem+1', alt: '', href: '' },
      { src: 'https://placehold.co/1200x500?text=Imagem+2', alt: '', href: '' },
      { src: 'https://placehold.co/1200x500?text=Imagem+3', alt: '', href: '' },
    ]),
    mode: 'auto',
    secs: '4',
    ratio: '16 / 9',
    fit: 'cover',
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
    {
      key: 'mode', label: 'Troca', type: 'select', group: 'Carrossel', def: 'auto',
      options: [{ value: 'auto', label: 'Autom\u00e1tica (infinita)' }, { value: 'manual', label: 'Manual (deslizar)' }],
    },
    { key: 'secs', label: 'Segundos por imagem', type: 'number', min: 1, max: 30, group: 'Carrossel', def: '4' },
    { key: 'ratio', label: 'Propor\u00e7\u00e3o', type: 'select', group: 'Carrossel', def: '16 / 9', options: [{ value: 'auto', label: 'Original' }, ...RATIOS] },
    {
      key: 'fit', label: 'Ajuste da imagem', type: 'select', group: 'Carrossel', def: 'cover',
      options: [{ value: 'cover', label: 'Preencher (recorta)' }, { value: 'contain', label: 'Mostrar inteira' }],
    },
    { key: 'maxW', label: 'Largura m\u00e1xima (px, 0 = total)', type: 'number', min: 0, max: 2400, group: 'Layout', def: '1200' },
    { key: 'radius', label: 'Arredondamento (px)', type: 'number', min: 0, max: 60, group: 'Layout', def: '8' },
    { key: 'bg', label: 'Cor de fundo da se\u00e7\u00e3o', type: 'color', group: 'Layout' },
    { key: 'pad', label: 'Espa\u00e7o vertical (px)', type: 'number', min: 0, max: 200, group: 'Layout', def: '16' },
  ],
  render: (p) => {
    const list = parseItems(p.items).filter((x) => x.src);
    const n = list.length;
    if (n === 0) {
      return <section style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>{'Adicione imagens ao carrossel.'}</section>;
    }
    const auto = p.mode !== 'manual' && n > 1;
    const sec = Math.min(30, Math.max(1, num(p.secs, 4)));
    const cls = `sll-car-${n}-${String(sec).replace('.', '_')}`;
    const ratio = p.ratio && p.ratio !== 'auto' ? p.ratio : undefined;
    const fit = p.fit === 'contain' ? 'contain' : 'cover';
    const mw = num(p.maxW, 1200);

    let css = '';
    if (auto) {
      const P = 100 / n;
      const S = 100 / (n + 1);
      let k = '';
      for (let i = 0; i < n; i++) {
        k += `${(i * P).toFixed(3)}%,${(i * P + P * 0.85).toFixed(3)}%{transform:translateX(-${(i * S).toFixed(4)}%)}`;
      }
      k += `100%{transform:translateX(-${(n * S).toFixed(4)}%)}`;
      css =
        `@keyframes ${cls}{${k}}` +
        `.${cls} .sll-car-t{animation:${cls} ${n * sec}s ease-in-out infinite}` +
        `.${cls}:hover .sll-car-t{animation-play-state:paused}` +
        '@media(prefers-reduced-motion:reduce){.' + cls + ' .sll-car-t{animation:none}}';
    }

    const slides = auto ? [...list, list[0]] : list;
    const track: CSSProperties = auto
      ? { display: 'flex', width: `${(n + 1) * 100}%` }
      : { display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory' };
    const slide: CSSProperties = auto
      ? { flex: `0 0 ${100 / (n + 1)}%`, minWidth: 0 }
      : { flex: '0 0 100%', minWidth: 0, scrollSnapAlign: 'start' };

    return (
      <section style={{ background: p.bg || undefined, padding: `${num(p.pad, 16)}px 32px` }}>
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
        <div
          className={auto ? cls : undefined}
          style={{ maxWidth: mw > 0 ? mw : undefined, margin: '0 auto', overflow: 'hidden', borderRadius: num(p.radius, 8) }}
        >
          <div className="sll-car-t" style={track}>
            {slides.map((it, i) => {
              const dup = auto && i === n;
              const im = (
                <img
                  src={safeUrl(it.src)}
                  alt={dup ? '' : it.alt || ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  style={{ width: '100%', display: 'block', aspectRatio: ratio, objectFit: fit }}
                />
              );
              const href = (it.href || '').trim();
              return (
                <div key={i} aria-hidden={dup ? true : undefined} style={slide}>
                  {href ? <a href={safeUrl(href)} tabIndex={dup ? -1 : undefined} style={{ display: 'block' }}>{im}</a> : im}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  },
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