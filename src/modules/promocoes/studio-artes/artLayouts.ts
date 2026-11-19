import { fitPhoto } from './layout';
import type { ArtInput, ArtStyle } from './renderArt';

type Ctx = CanvasRenderingContext2D;

/** Posicao (fracao da altura da imagem de fundo) onde a base do produto toca o podio. Ajuste aqui se precisar. */
const PODIUM_BASE = { feed: 0.72, story: 0.68 };

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function inkOn(hex: string): string {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const r = parseInt(f.slice(0, 2), 16);
  const g = parseInt(f.slice(2, 4), 16);
  const b = parseInt(f.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#111111' : '#ffffff';
}

function wrapText(ctx: Ctx, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
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

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const headFont = (n: number, u: number) => `italic 900 ${n * u}px "Montserrat", Arial, sans-serif`;
const bodyFont = (n: number, u: number, w = 600) => `${w} ${n * u}px "Poppins", Arial, sans-serif`;

function drawCta(ctx: Ctx, cx: number, y: number, mw: number, u: number, accent: string, label: string) {
  const text = label.toUpperCase();
  ctx.font = headFont(30, u);
  ctx.textBaseline = 'middle';
  const cw = Math.min(ctx.measureText(text).width + 70 * u, mw);
  const ch = 58 * u;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(cx - cw / 2, y - ch / 2, cw, ch, 14 * u);
  ctx.fill();
  ctx.fillStyle = inkOn(accent);
  ctx.fillText(text, cx, y + 2 * u, cw - 30 * u);
  ctx.textBaseline = 'alphabetic';
}

function drawBadge(ctx: Ctx, x: number, y: number, r: number, u: number, accent: string, pct: number) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = inkOn(accent);
  ctx.textAlign = 'center';
  ctx.font = headFont(46, u);
  ctx.fillText(`${Math.round(pct)}%`, x, y + 8 * u, r * 1.6);
  ctx.font = headFont(24, u);
  ctx.fillText('OFF', x, y + 38 * u, r * 1.6);
}

function drawOld(ctx: Ctx, cx: number, y: number, mw: number, u: number, color: string, original: number) {
  const t = `De ${brl(original)}`;
  ctx.font = bodyFont(28, u);
  ctx.fillStyle = color;
  ctx.fillText(t, cx, y, mw);
  const tw = Math.min(ctx.measureText(t).width, mw);
  ctx.fillRect(cx - tw / 2, y - 9 * u, tw, 3 * u);
}

/* ====================== VITRINE PODIO ====================== */
export function drawVitrine(ctx: Ctx, p: ArtInput, o: ArtStyle, img: HTMLImageElement, bgImg: HTMLImageElement | null) {
  const { w: W, h: H } = o;
  const u = Math.min(W / 1080, H / 1350);
  const s = W / 1080;
  const story = H / W > 1.5;
  const ink = '#1f1f24';
  const sub = '#5c5c66';
  const frac = story ? PODIUM_BASE.story : PODIUM_BASE.feed;
  let baseY = H * frac;

  if (bgImg) {
    const k = Math.max(W / bgImg.width, H / bgImg.height);
    const dw = bgImg.width * k;
    const dh = bgImg.height * k;
    const dy = H - dh;
    ctx.drawImage(bgImg, (W - dw) / 2, dy, dw, dh);
    baseY = dy + dh * frac;
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f2f2f2');
    g.addColorStop(1, '#d9d9d9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const cx = W / 2;
  const mw = W * 0.84;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Topo: chamada, titulo e nome do produto (nada sobre o produto)
  ctx.font = bodyFont(28, u);
  ctx.fillStyle = sub;
  ctx.fillText((o.kicker || o.subtitle).toUpperCase(), cx, H * 0.055, mw);
  ctx.font = headFont(96, u);
  ctx.fillStyle = o.accent;
  ctx.fillText(o.title.toUpperCase(), cx, H * 0.125, mw);
  ctx.font = bodyFont(40, u);
  ctx.fillStyle = ink;
  let ny = H * 0.178;
  wrapText(ctx, p.name.toUpperCase(), mw, 2).forEach((l) => { ctx.fillText(l, cx, ny, mw); ny += 48 * u; });

  // Produto: encaixado entre o nome e o podio, base tocando o podio
  const top = H * 0.235;
  const rect = { x: W * 0.12, y: top, w: W * 0.76, h: Math.max(baseY - top, 120) };
  const ph = fitPhoto(img.width, img.height, rect, o.photoScale ?? 1, o.photoOffsetX ?? 0, o.photoOffsetY ?? 0);

  const rx = ph.w * 0.4;
  const ry = 16 * u;
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  sh.addColorStop(0, 'rgba(0,0,0,0.38)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(ph.x + ph.w / 2, ph.y + ph.h);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(img, ph.x, ph.y, ph.w, ph.h);

  if (p.pct > 0) drawBadge(ctx, W * 0.83, top + 70 * u, 78 * u, u, o.accent, p.pct);

  // Precos na frente do podio
  const hasOld = p.original > p.promo;
  if (hasOld) drawOld(ctx, cx, baseY + 108 * s, W * 0.5, u, sub, p.original);
  ctx.font = headFont(60, u);
  ctx.fillStyle = ink;
  ctx.fillText(`Por ${brl(p.promo)}`, cx, baseY + 185 * s, W * 0.5);

  // Botao e site no piso
  drawCta(ctx, cx, baseY + 277 * s, mw, u, o.accent, o.cta || 'COMPRE AGORA');
  ctx.font = bodyFont(28, u);
  ctx.fillStyle = sub;
  ctx.fillText(o.site, cx, Math.min(baseY + 340 * s, H - 24 * u), mw);
}

/* ====================== TEMAS SAZONAIS ====================== */
type Deco = 'snow' | 'hearts' | 'burst' | 'sparks';
interface Theme { ink: string; sub: string; deco: Deco; script: boolean; upper: boolean }

const THEMES: Record<string, Theme> = {
  natal: { ink: '#ffffff', sub: '#ffe9c2', deco: 'snow', script: true, upper: false },
  'dia-das-maes': { ink: '#4a1230', sub: '#8a4a66', deco: 'hearts', script: true, upper: false },
  liquidacao: { ink: '#111111', sub: '#4a3a00', deco: 'burst', script: false, upper: true },
  'black-friday-ouro': { ink: '#ffffff', sub: '#c9b88a', deco: 'sparks', script: false, upper: true },
};

export const isSeasonal = (k: string) => Object.prototype.hasOwnProperty.call(THEMES, k);

export function loadSeasonalFonts(): Promise<void> {
  const specs = ['italic 900 40px "Montserrat"', '600 40px "Poppins"', '400 40px "Pacifico"'];
  const all = Promise.all(specs.map((sp) => document.fonts.load(sp, 'Aa').catch(() => []))).then(() => undefined);
  return Promise.race([all, new Promise<void>((r) => setTimeout(r, 3000))]);
}

function heart(ctx: Ctx, x: number, y: number, t: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + t * 0.25);
  ctx.bezierCurveTo(x, y - t * 0.1, x - t * 0.5, y - t * 0.1, x - t * 0.5, y + t * 0.2);
  ctx.bezierCurveTo(x - t * 0.5, y + t * 0.5, x, y + t * 0.7, x, y + t * 0.9);
  ctx.bezierCurveTo(x, y + t * 0.7, x + t * 0.5, y + t * 0.5, x + t * 0.5, y + t * 0.2);
  ctx.bezierCurveTo(x + t * 0.5, y - t * 0.1, x, y - t * 0.1, x, y + t * 0.25);
  ctx.closePath();
}

function star(ctx: Ctx, x: number, y: number, t: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - t);
  ctx.quadraticCurveTo(x, y, x + t, y);
  ctx.quadraticCurveTo(x, y, x, y + t);
  ctx.quadraticCurveTo(x, y, x - t, y);
  ctx.quadraticCurveTo(x, y, x, y - t);
  ctx.closePath();
}

function decorate(ctx: Ctx, kind: Deco, W: number, H: number, u: number, accent: string) {
  const rand = rng(11);
  ctx.save();
  if (kind === 'snow') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.25 + rand() * 0.5;
      ctx.beginPath();
      ctx.arc(rand() * W, rand() * H, (2 + rand() * 6) * u, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'hearts') {
    for (let i = 0; i < 18; i++) {
      ctx.globalAlpha = 0.18 + rand() * 0.2;
      ctx.fillStyle = i % 2 ? '#ffffff' : accent;
      heart(ctx, rand() * W, rand() * H, (30 + rand() * 70) * u);
      ctx.fill();
    }
  } else if (kind === 'burst') {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.2;
    const cx = W / 2;
    const cy = H * 0.42;
    const R = Math.hypot(W, H);
    const n = 28;
    for (let i = 0; i < n; i += 2) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = accent;
    for (let i = 0; i < 30; i++) {
      ctx.globalAlpha = 0.25 + rand() * 0.5;
      star(ctx, rand() * W, rand() * H, (8 + rand() * 22) * u);
      ctx.fill();
    }
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4 * u;
    ctx.strokeRect(28 * u, 28 * u, W - 56 * u, H - 56 * u);
  }
  ctx.restore();
}

export function drawSeasonal(ctx: Ctx, p: ArtInput, o: ArtStyle, img: HTMLImageElement) {
  const th = THEMES[o.template ?? ''];
  if (!th) return;
  const { w: W, h: H } = o;
  const u = Math.min(W / 1080, H / 1350);
  const story = H / W > 1.5;
  const T = (t: string) => (th.upper ? t.toUpperCase() : t);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, o.bgFrom);
  g.addColorStop(1, o.bgTo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  decorate(ctx, th.deco, W, H, u, o.accent);

  const cx = W / 2;
  const mw = W * 0.86;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const kickerY = H * 0.065;
  const kick = o.kicker || o.subtitle;
  if (th.script) {
    ctx.font = `400 ${46 * u}px "Pacifico", cursive`;
    ctx.fillStyle = o.accent;
    ctx.fillText(kick, cx, kickerY, mw);
  } else {
    ctx.font = bodyFont(30, u);
    ctx.fillStyle = th.sub;
    ctx.fillText(kick.toUpperCase(), cx, kickerY, mw);
  }
  ctx.font = headFont(100, u);
  ctx.fillStyle = o.accent;
  ctx.fillText(o.title.toUpperCase(), cx, kickerY + 100 * u, mw);

  const rect = story
    ? { x: W * 0.08, y: H * 0.17, w: W * 0.84, h: H * 0.45 }
    : { x: W * 0.1, y: H * 0.19, w: W * 0.8, h: H * 0.46 };
  const ph = fitPhoto(img.width, img.height, rect, o.photoScale ?? 1, o.photoOffsetX ?? 0, o.photoOffsetY ?? 0);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.32)';
  ctx.shadowBlur = 30 * u;
  ctx.shadowOffsetY = 18 * u;
  ctx.drawImage(img, ph.x, ph.y, ph.w, ph.h);
  ctx.restore();

  if (p.pct > 0) drawBadge(ctx, W * 0.84, rect.y + 80 * u, 88 * u, u, o.accent, p.pct);

  let y = H * 0.715;
  ctx.font = bodyFont(46, u);
  ctx.fillStyle = th.ink;
  wrapText(ctx, T(p.name), mw, 2).forEach((l) => { ctx.fillText(l, cx, y, mw); y += 56 * u; });

  if (p.original > p.promo) drawOld(ctx, cx, H * 0.79, mw, u, th.sub, p.original);
  ctx.font = headFont(78, u);
  ctx.fillStyle = th.ink;
  ctx.fillText(`Por ${brl(p.promo)}`, cx, H * 0.79 + 80 * u, mw);

  drawCta(ctx, cx, H * 0.9, mw, u, o.accent, o.cta || 'COMPRE AGORA');
  ctx.font = bodyFont(30, u);
  ctx.fillStyle = th.sub;
  ctx.fillText(o.site, cx, H * 0.955, mw);
}