import type { CSSProperties } from 'react';
import type { BlockType } from '../types';
import type { BlockDef } from '../registry-extra';
import { ALIGN_OPTIONS, num, safeUrl, textCss, textFields } from '../styleKit';

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

type Src = { kind: 'file' | 'yt' | 'vimeo' | 'panda' | 'other'; id: string; url: string };
type Opt = { auto: boolean; mute: boolean; loop: boolean; ctl: boolean };

function parse(raw: string): Src {
  const ifr = raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const url = (ifr ? ifr[1] : raw).trim();
  if (/pandavideo\.com\.br/i.test(url)) return { kind: 'panda', id: '', url: safeUrl(url) };
  if (/\.(mp4|webm|ogg)($|\?)/i.test(url)) return { kind: 'file', id: '', url: safeUrl(url) };
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt) return { kind: 'yt', id: yt[1], url };
  const vm = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  if (vm) return { kind: 'vimeo', id: vm[1], url };
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

export const MEDIA_BLOCKS: Partial<Record<BlockType, BlockDef>> = {
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
      { key: 'url', label: 'Link ou c\u00f3digo do v\u00eddeo (YouTube, Vimeo, Panda ou MP4)' },
      { key: 'title', label: 'T\u00edtulo (opcional)' },
      { key: 'cover', label: 'Imagem de capa (opcional)' },
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