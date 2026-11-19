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

async function loadImg(src: string) {
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
    cut[maxLines - 1] = cut[maxLines - 1].replace(/.{0,2}$/, '…');
    return cut;
  }
  return lines;
}

export async function renderArt(p: ArtInput, o: ArtStyle): Promise<Blob> {
  const { w: W, h: H } = o;
  const s = W / 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

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

  const img = await loadImg(p.image_url);
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

  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falhou'))), 'image/png'),
  );
}
