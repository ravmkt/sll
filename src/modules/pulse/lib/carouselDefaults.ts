import type { CarouselDesign, CarouselFont } from '../types/infoCards';

export const CAROUSEL_FONTS: { id: CarouselFont; label: string; stack: string }[] = [
  { id: 'inherit', label: 'Herdar da loja', stack: 'inherit' },
  { id: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet', stack: "'Trebuchet MS', sans-serif" },
  { id: 'georgia', label: 'Georgia', stack: 'Georgia, serif' },
  { id: 'times', label: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
  { id: 'courier', label: 'Courier New', stack: "'Courier New', monospace" },
];

export const DEFAULT_CAROUSEL: CarouselDesign = {
  shape: 'square', aspect: '1 / 1', fit: 'contain', img_radius: 0, img_bg: '#F5F5F5',
  size_mode: 'auto', size_d: 140, size_m: 96,
  border_on: false, border_color: '#E2E8F0', border_w: 1,
  caption_pos: 'below', caption_color: '#111111', caption_size: 13, caption_font: 'inherit', caption_bold: false,
  title_color: '#111111', title_size: 18, title_font: 'inherit', title_bold: true,
  gap: 16, per_desktop: 6, per_mobile: 2.5,
  arrows: true, arrow_color: '#111111', autoplay: false, autoplay_ms: 4000,
  bg_on: false, bg_color: '#FFFFFF', pad_x: 0, pad_t: 0, pad_b: 0,
};

export function normalizeCarousel(d?: object): CarouselDesign {
  const r = (d ?? {}) as Record<string, unknown>;
  const m = { ...DEFAULT_CAROUSEL, ...r } as CarouselDesign;
  const isNew = 'size_mode' in r;
  const wasRounded = String(r.shape) === 'rounded';
  const legacyPad = typeof r.pad === 'number' ? r.pad : 0;
  const pick = (v: unknown) => (typeof v === 'number' ? v : legacyPad);
  return {
    ...m,
    shape: String(m.shape) === 'circle' ? 'circle' : 'square',
    img_radius: isNew || wasRounded ? Math.min(50, m.img_radius) : 0,
    pad_x: pick(r.pad_x), pad_t: pick(r.pad_t), pad_b: pick(r.pad_b),
  };
}
