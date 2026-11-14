import type { CarouselDesign } from '../types/infoCards';

export const DEFAULT_CAROUSEL: CarouselDesign = {
  shape: 'square', aspect: '1 / 1', fit: 'contain', img_radius: 12, img_bg: '#F5F5F5',
  border_on: false, border_color: '#E2E8F0', border_w: 1,
  caption_pos: 'below', caption_color: '#111111', caption_size: 13,
  gap: 16, per_desktop: 6, per_mobile: 2.5,
  arrows: true, arrow_color: '#111111', autoplay: false, autoplay_ms: 4000,
  bg_on: false, bg_color: '#FFFFFF', pad: 0, title_color: '#111111',
};
