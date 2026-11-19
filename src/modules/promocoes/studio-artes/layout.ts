export interface Rect { x: number; y: number; w: number; h: number }

export interface BFLayout {
  mode: 'side' | 'stack';
  u: number;
  orange: Rect;
  photo: Rect;
  text: { cx: number; mw: number; top: number };
  ctaY: number;
  siteY: number;
}

/** Define, por proporcao do canal, onde fica o bloco colorido, a area da foto e a coluna de textos. */
export function bfLayout(W: number, H: number): BFLayout {
  const ratio = H / W;
  const u = Math.min(W / 1080, H / 1350);

  if (ratio > 1.5) {
    return {
      mode: 'stack',
      u,
      orange: { x: 0, y: 0, w: W, h: H * 0.48 },
      photo: { x: W * 0.05, y: H * 0.03, w: W * 0.9, h: H * 0.45 },
      text: { cx: W / 2, mw: W * 0.88, top: H * 0.52 },
      ctaY: H * 0.9,
      siteY: H * 0.95,
    };
  }

  if (ratio < 1.15) {
    return {
      mode: 'side',
      u,
      orange: { x: 0, y: 0, w: W * 0.5, h: H * 0.76 },
      photo: { x: 0, y: H * 0.04, w: W * 0.58, h: H * 0.94 },
      text: { cx: W * 0.775, mw: W * 0.42, top: H * 0.06 },
      ctaY: H * 0.82,
      siteY: H * 0.9,
    };
  }

  return {
    mode: 'side',
    u,
    orange: { x: 0, y: 0, w: W * 0.5, h: H * 0.76 },
    photo: { x: 0, y: H * 0.05, w: W * 0.6, h: H * 0.93 },
    text: { cx: W * 0.77, mw: W * 0.44, top: H * 0.06 },
    ctaY: H * 0.82,
    siteY: H * 0.88,
  };
}

/** Encaixa a foto na area (contain), alinhada na base. scale/offsets permitem ajuste fino. */
export function fitPhoto(iw: number, ih: number, r: Rect, scale = 1, ox = 0, oy = 0): Rect {
  const k = Math.min(r.w / iw, r.h / ih) * scale;
  const w = iw * k;
  const h = ih * k;
  return { x: r.x + (r.w - w) / 2 + ox * r.w, y: r.y + r.h - h + oy * r.h, w, h };
}