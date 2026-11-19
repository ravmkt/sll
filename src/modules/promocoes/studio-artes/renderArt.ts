import { bfLayout, fitPhoto } from './layout';
import { getCutout } from './cutout';
export type ArtInput = { name: string; image_url: string; original: number; promo: number; pct: number };
export type ArtStyle = {
  title: string;
  subtitle: string;
  site: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
  w: number;
  h: number;
  template?: string;
  kicker?: string;
  cta?: string;
  photoScale?: number;
  photoOffsetX?: number;
  photoOffsetY?: number;
  cutout?: boolean;
};

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const load = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Falha ao carregar imagem'));
    i.src = src;
  });

export async function loadImg(src: string) {
  if (src.startsWith('blob:') || src.startsWith('data:')) return load(src);
  try {
    return await load(src);
  } catch {
    return await load(`https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ''))}&output=png`);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/.{0,2}$/, '\u2026');
    return cut;
  }
  return lines;
}

function classico(ctx: CanvasRenderingContext2D, p: ArtInput, o: ArtStyle, img: HTMLImageElement) {
  const { w: W, h: H } = o;
  const s = W / 1080;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, o.bgFrom);
  g.addColorStop(1, o.bgTo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${110 * s}px Arial`;
  ctx.fillText(o.title.toUpperCase(), W / 2, H * 0.095, W - 100 * s);
  ctx.fillStyle = o.accent;
  ctx.font = `700 ${40 * s}px Arial`;
  ctx.fillText(o.subtitle, W / 2, H * 0.095 + 62 * s, W - 100 * s);

  const bx = 80 * s, by = H * 0.16, bw = W - 160 * s, bh = H * 0.48;
  const k = Math.min(bw / img.width, bh / img.height);
  const dw = img.width * k, dh = img.height * k;
  ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);

  if (p.pct > 0) {
    const cx = W - 160 * s, cy = by + 90 * s, r = 95 * s;
    ctx.fillStyle = o.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${54 * s}px Arial`;
    ctx.fillText(`${Math.round(p.pct)}%`, cx, cy + 10 * s);
    ctx.font = `700 ${30 * s}px Arial`;
    ctx.fillText('OFF', cx, cy + 46 * s);
  }

  ctx.fillStyle = '#fff';
  ctx.font = `700 ${50 * s}px Arial`;
  const lines = wrap(ctx, p.name, W - 140 * s, 2);
  const ny = H * 0.715;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, ny + i * 58 * s));

  const oldTxt = `De: ${brl(p.original)}`;
  const oy = H * 0.835;
  ctx.fillStyle = '#cfcfcf';
  ctx.font = `400 ${38 * s}px Arial`;
  ctx.fillText(oldTxt, W / 2, oy);
  const tw = ctx.measureText(oldTxt).width;
  ctx.fillRect(W / 2 - tw / 2, oy - 13 * s, tw, 3 * s);

  ctx.fillStyle = '#fff';
  ctx.font = `900 ${88 * s}px Arial`;
  ctx.fillText(`Por: ${brl(p.promo)}`, W / 2, H * 0.915, W - 80 * s);

  ctx.fillStyle = o.accent;
  ctx.font = `700 ${36 * s}px Arial`;
  ctx.fillText(o.site, W / 2, H * 0.968, W - 80 * s);
}

function blackfriday(ctx: CanvasRenderingContext2D, p: ArtInput, o: ArtStyle, img: HTMLImageElement) {
  const { w: W, h: H } = o;
  const L = bfLayout(W, H);
  const u = L.u;
  const font = (size: number) => `italic 900 ${size * u}px "Arial Black", Arial, sans-serif`;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = o.accent;
  ctx.fillRect(L.orange.x, L.orange.y, L.orange.w, L.orange.h);

  const ph = fitPhoto(img.width, img.height, L.photo, o.photoScale ?? 1, o.photoOffsetX ?? 0, o.photoOffsetY ?? 0);
  ctx.drawImage(img, ph.x, ph.y, ph.w, ph.h);

  const cx = L.text.cx;
  const mw = L.text.mw;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let y = L.text.top;

  ctx.fillStyle = '#fff';
  ctx.font = font(34);
  ctx.fillText((o.kicker || o.subtitle).toUpperCase(), cx, y, mw);

  y += 115 * u;
  ctx.fillStyle = o.accent;
  ctx.font = font(120);
  ctx.fillText(o.title.toUpperCase(), cx, y, mw);

  y += 95 * u;
  ctx.fillStyle = '#fff';
  ctx.font = font(66);
  const lines = wrap(ctx, p.name.toUpperCase(), mw, L.mode === 'stack' ? 2 : 3);
  lines.forEach((l) => { ctx.fillText(l, cx, y, mw); y += 72 * u; });

  if (p.pct > 0) {
    y += 20 * u;
    ctx.fillStyle = '#fff';
    ctx.font = font(38);
    ctx.fillText('AT\u00c9', cx, y, mw);
    y += 105 * u;
    ctx.fillStyle = o.accent;
    ctx.font = font(120);
    ctx.fillText(`${Math.round(p.pct)}% OFF`, cx, y, mw);
  }

  y += 70 * u;
  const oldTxt = `De ${brl(p.original)}`;
  ctx.fillStyle = '#bdbdbd';
  ctx.font = `italic 400 ${34 * u}px Arial`;
  ctx.fillText(oldTxt, cx, y, mw);
  const tw = Math.min(ctx.measureText(oldTxt).width, mw);
  ctx.fillRect(cx - tw / 2, y - 12 * u, tw, 3 * u);

  y += 70 * u;
  ctx.fillStyle = '#fff';
  ctx.font = font(66);
  ctx.fillText(`Por ${brl(p.promo)}`, cx, y, mw);

  const cta = (o.cta || 'COMPRE AGORA').toUpperCase();
  const cy = L.ctaY;
  ctx.font = font(34);
  const cw = Math.min(ctx.measureText(cta).width + 60 * u, mw);
  const chh = 64 * u;
  ctx.fillStyle = o.accent;
  ctx.beginPath();
  ctx.roundRect(cx - cw / 2, cy - chh / 2, cw, chh, 12 * u);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, cx, cy + 2 * u, cw - 30 * u);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.font = font(34);
  ctx.fillText(o.site, cx, L.siteY, mw);
}

export async function renderArt(p: ArtInput, o: ArtStyle): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = o.w;
  canvas.height = o.h;
  const ctx = canvas.getContext('2d')!;
  const img = o.template === 'blackfriday' && o.cutout !== false ? await getCutout(p.image_url).catch(() => loadImg(p.image_url)) : await loadImg(p.image_url);

  if (o.template === 'blackfriday') blackfriday(ctx, p, o, img);
  else classico(ctx, p, o, img);

  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falhou'))), 'image/png'),
  );
}