import { bfLayout, fitPhoto } from './layout';
import type { Rect } from './layout';
import { getCutout } from './cutout';
import { templateByKey } from './templates';

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

/* ====================== CLASSICO ====================== */
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

/* ====================== BLACK FRIDAY ====================== */
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

/* ====================== TEMPLATES NOVOS (generico) ====================== */
type Pos = 'left' | 'right' | 'center';

interface Look {
  bg: 'image' | 'sombra' | 'pop' | 'minimal';
  ink: string;
  sub: string;
  badgeInk: string;
  head: string;
  headWeight: number;
  headItalic: boolean;
  body: string;
  bodyWeight: number;
  upper: boolean;
  script: boolean;
  pos: Pos;
  groundShadow: boolean;
  photoShadow: boolean;
}

// Ajuste aqui cores de texto, fontes e posicao da foto de cada template.
const LOOKS: Record<string, Look> = {
  'editorial-pincel': { bg: 'image', ink: '#2b2118', sub: '#6b5b4b', badgeInk: '#ffffff', head: 'Playfair Display', headWeight: 900, headItalic: false, body: 'Poppins', bodyWeight: 600, upper: false, script: false, pos: 'left', groundShadow: true, photoShadow: false },
  'vitrine-podio': { bg: 'image', ink: '#ffffff', sub: '#d0d0d0', badgeInk: '#111111', head: 'Montserrat', headWeight: 900, headItalic: true, body: 'Poppins', bodyWeight: 600, upper: true, script: false, pos: 'center', groundShadow: false, photoShadow: true },
  'palco-holofote': { bg: 'image', ink: '#ffffff', sub: '#c9c9e0', badgeInk: '#ffffff', head: 'Montserrat', headWeight: 900, headItalic: true, body: 'Poppins', bodyWeight: 600, upper: true, script: false, pos: 'center', groundShadow: false, photoShadow: true },
  'holofote-minimal': { bg: 'image', ink: '#ffffff', sub: '#bdbdbd', badgeInk: '#0b0b0b', head: 'Poppins', headWeight: 800, headItalic: false, body: 'Poppins', bodyWeight: 400, upper: true, script: false, pos: 'center', groundShadow: false, photoShadow: true },
  'novidade-diagonal': { bg: 'image', ink: '#1b1b1b', sub: '#555555', badgeInk: '#ffffff', head: 'Poppins', headWeight: 800, headItalic: false, body: 'Poppins', bodyWeight: 600, upper: true, script: true, pos: 'right', groundShadow: true, photoShadow: false },
  'estudio-sombra': { bg: 'sombra', ink: '#2a2622', sub: '#7a6f64', badgeInk: '#ffffff', head: 'Playfair Display', headWeight: 700, headItalic: false, body: 'Poppins', bodyWeight: 600, upper: false, script: false, pos: 'left', groundShadow: true, photoShadow: false },
  'pop-colorido': { bg: 'pop', ink: '#ffffff', sub: '#fff4e0', badgeInk: '#e8363a', head: 'Montserrat', headWeight: 900, headItalic: true, body: 'Poppins', bodyWeight: 600, upper: true, script: true, pos: 'center', groundShadow: true, photoShadow: false },
  'minimal-claro': { bg: 'minimal', ink: '#111111', sub: '#6b6b6b', badgeInk: '#ffffff', head: 'Poppins', headWeight: 800, headItalic: false, body: 'Poppins', bodyWeight: 400, upper: true, script: false, pos: 'right', groundShadow: true, photoShadow: false },
};

interface GL {
  stack: boolean;
  u: number;
  photo: Rect;
  cx: number;
  mw: number;
  top: number;
  ctaY: number;
  siteY: number;
}

function gLayout(W: number, H: number, pos: Pos): GL {
  const ratio = H / W;
  const u = Math.min(W / 1080, H / 1350);
  const stack = ratio > 1.5 || (pos === 'center' && ratio >= 1.15);
  if (stack) {
    const story = ratio > 1.5;
    return {
      stack: true, u,
      photo: story ? { x: W * 0.08, y: H * 0.13, w: W * 0.84, h: H * 0.42 } : { x: W * 0.12, y: H * 0.15, w: W * 0.76, h: H * 0.41 },
      cx: W / 2, mw: W * 0.86, top: H * 0.06, ctaY: H * 0.9, siteY: H * 0.955,
    };
  }
  const left = pos !== 'right';
  return {
    stack: false, u,
    photo: left ? { x: W * 0.02, y: H * 0.1, w: W * 0.5, h: H * 0.88 } : { x: W * 0.48, y: H * 0.1, w: W * 0.5, h: H * 0.88 },
    cx: left ? W * 0.75 : W * 0.25, mw: W * 0.42, top: H * 0.09, ctaY: H * 0.82, siteY: H * 0.9,
  };
}

function setBlur(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as unknown as { filter: string }).filter = px > 0 ? `blur(${px}px)` : 'none';
}

function drawBg(ctx: CanvasRenderingContext2D, W: number, H: number, u: number, look: Look, o: ArtStyle, bgImg: HTMLImageElement | null) {
  if (bgImg) {
    const k = Math.max(W / bgImg.width, H / bgImg.height);
    const dw = bgImg.width * k, dh = bgImg.height * k;
    ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, o.bgFrom);
  g.addColorStop(1, o.bgTo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (look.bg === 'sombra') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(W * 0.35, 0);
    ctx.lineTo(W * 0.78, 0);
    ctx.lineTo(W * 0.38, H);
    ctx.lineTo(-W * 0.05, H);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    setBlur(ctx, 16 * u);
    ctx.fillStyle = 'rgba(70,60,48,0.16)';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(W * (0.92 - i * 0.035), H * (0.05 + i * 0.055), W * 0.09, W * 0.026, i % 2 ? -0.2 : -1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(W * (0.12 + i * 0.03), H * (0.9 - i * 0.05), W * 0.08, W * 0.022, i % 2 ? 0.9 : 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (look.bg === 'pop') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    const dots: Array<[number, number, number]> = [[0.15, 0.1, 0.18], [0.9, 0.3, 0.14], [0.08, 0.62, 0.12], [0.85, 0.85, 0.2], [0.5, 0.97, 0.1]];
    dots.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(W * x, H * y, W * r, 0, Math.PI * 2); ctx.fill(); });
  } else if (look.bg === 'minimal') {
    ctx.fillStyle = o.accent;
    ctx.fillRect(0, 0, W, 14 * u);
  }
}

function gen(ctx: CanvasRenderingContext2D, p: ArtInput, o: ArtStyle, img: HTMLImageElement, look: Look, bgImg: HTMLImageElement | null) {
  const { w: W, h: H } = o;
  const L = gLayout(W, H, look.pos);
  const u = L.u;
  const T = (s: string) => (look.upper ? s.toUpperCase() : s);
  const head = (s: number) => `${look.headItalic ? 'italic ' : ''}${look.headWeight} ${s * u}px "${look.head}", Arial, sans-serif`;
  const body = (s: number) => `${look.bodyWeight} ${s * u}px "${look.body}", Arial, sans-serif`;

  drawBg(ctx, W, H, u, look, o, bgImg);

  const ph = fitPhoto(img.width, img.height, L.photo, o.photoScale ?? 1, o.photoOffsetX ?? 0, o.photoOffsetY ?? 0);
  if (look.groundShadow) {
    ctx.save();
    setBlur(ctx, 14 * u);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(ph.x + ph.w / 2, ph.y + ph.h - 6 * u, ph.w * 0.42, 22 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  if (look.photoShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 30 * u;
    ctx.shadowOffsetY = 18 * u;
  }
  ctx.drawImage(img, ph.x, ph.y, ph.w, ph.h);
  ctx.restore();

  const cx = L.cx;
  const mw = L.mw;
  const kick = o.kicker || o.subtitle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const drawKicker = (y: number) => {
    if (look.script) {
      ctx.font = `400 ${46 * u}px "Pacifico", cursive`;
      ctx.fillStyle = o.accent;
      ctx.fillText(kick, cx, y, mw);
    } else {
      ctx.font = body(30);
      ctx.fillStyle = look.sub;
      ctx.fillText(kick.toUpperCase(), cx, y, mw);
    }
  };
  const drawPrices = (y: number, porSize: number) => {
    const oldTxt = `De ${brl(p.original)}`;
    ctx.fillStyle = look.sub;
    ctx.font = body(34);
    ctx.fillText(oldTxt, cx, y, mw);
    const tw = Math.min(ctx.measureText(oldTxt).width, mw);
    ctx.fillRect(cx - tw / 2, y - 11 * u, tw, 3 * u);
    y += 85 * u;
    ctx.fillStyle = look.ink;
    ctx.font = head(porSize);
    ctx.fillText(`Por ${brl(p.promo)}`, cx, y, mw);
  };

  if (L.stack) {
    let y = L.top;
    drawKicker(y);
    y += 105 * u;
    ctx.fillStyle = o.accent;
    ctx.font = head(110);
    ctx.fillText(T(o.title), cx, y, mw);

    if (p.pct > 0) {
      const bx = W * 0.84, by = L.photo.y + 90 * u, r = 95 * u;
      ctx.fillStyle = o.accent;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.badgeInk;
      ctx.font = head(54);
      ctx.fillText(`${Math.round(p.pct)}%`, bx, by + 10 * u, r * 1.6);
      ctx.font = head(28);
      ctx.fillText('OFF', bx, by + 46 * u, r * 1.6);
    }

    y = L.photo.y + L.photo.h + 70 * u;
    ctx.fillStyle = look.ink;
    ctx.font = body(46);
    wrap(ctx, T(p.name), mw, 2).forEach((l) => { ctx.fillText(l, cx, y, mw); y += 56 * u; });
    drawPrices(y + 20 * u, 78);
  } else {
    let y = L.top + 30 * u;
    drawKicker(y);
    y += 100 * u;
    ctx.fillStyle = o.accent;
    ctx.font = head(104);
    ctx.fillText(T(o.title), cx, y, mw);

    y += 90 * u;
    ctx.fillStyle = look.ink;
    ctx.font = body(50);
    wrap(ctx, T(p.name), mw, 3).forEach((l) => { ctx.fillText(l, cx, y, mw); y += 60 * u; });

    if (p.pct > 0) {
      y += 30 * u;
      ctx.fillStyle = o.accent;
      ctx.font = head(92);
      ctx.fillText(`${Math.round(p.pct)}% OFF`, cx, y, mw);
    }
    drawPrices(y + 70 * u, 64);
  }

  const cta = (o.cta || 'COMPRE AGORA').toUpperCase();
  ctx.font = head(32);
  const cw = Math.min(ctx.measureText(cta).width + 60 * u, mw);
  const chh = 64 * u;
  ctx.fillStyle = o.accent;
  ctx.beginPath();
  ctx.roundRect(cx - cw / 2, L.ctaY - chh / 2, cw, chh, 14 * u);
  ctx.fill();
  ctx.fillStyle = look.badgeInk;
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, cx, L.ctaY + 2 * u, cw - 30 * u);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = look.sub;
  ctx.font = body(30);
  ctx.fillText(o.site, cx, L.siteY, mw);
}

function ensureFonts(look: Look): Promise<void> {
  const specs = [
    `${look.headItalic ? 'italic ' : ''}${look.headWeight} 40px "${look.head}"`,
    `${look.bodyWeight} 40px "${look.body}"`,
  ];
  if (look.script) specs.push('400 40px "Pacifico"');
  const all = Promise.all(specs.map((s) => document.fonts.load(s, 'Aa').catch(() => []))).then(() => undefined);
  return Promise.race([all, new Promise<void>((r) => setTimeout(r, 3000))]);
}

/* ====================== ENTRADA ====================== */
export async function renderArt(p: ArtInput, o: ArtStyle): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = o.w;
  canvas.height = o.h;
  const ctx = canvas.getContext('2d')!;

  const tpl = templateByKey(o.template ?? 'classico');
  const look = LOOKS[tpl.key];
  const useCut = !!tpl.cutout && o.cutout !== false;

  if (look) await ensureFonts(look);

  const bgSrc = look && tpl.bgType === 'image' && tpl.images ? (o.h / o.w > 1.5 ? tpl.images.story : tpl.images.feed) : '';
  const [img, bgImg] = await Promise.all([
    useCut ? getCutout(p.image_url).catch(() => loadImg(p.image_url)) : loadImg(p.image_url),
    bgSrc ? load(bgSrc).catch(() => null) : Promise.resolve<HTMLImageElement | null>(null),
  ]);

  if (tpl.key === 'blackfriday') blackfriday(ctx, p, o, img);
  else if (look) gen(ctx, p, o, img, look, bgImg);
  else classico(ctx, p, o, img);

  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falhou'))), 'image/png'),
  );
}