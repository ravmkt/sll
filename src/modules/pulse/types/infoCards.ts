import type { Placement } from '../components/widgets/WidgetPlacementPicker';
import type { Tier } from './widgets';

export type CardKind = 'info' | 'benefits' | 'carousel';
export type IconPosition = 'top' | 'left' | 'right';
export type IconBg = 'none' | 'circle' | 'square';

export type CarouselItem = Tier & { image: string; link?: string; color?: string };

export type CarouselFont = 'inherit' | 'arial' | 'verdana' | 'trebuchet' | 'georgia' | 'times' | 'courier';

export interface CarouselDesign {
  shape: 'square' | 'circle'; aspect: string; fit: 'contain' | 'cover'; img_radius: number; img_bg: string;
  size_mode: 'auto' | 'fixed'; size_d: number; size_m: number;
  border_on: boolean; border_color: string; border_w: number;
  caption_pos: 'below' | 'overlay' | 'none'; caption_color: string; caption_size: number; caption_font: CarouselFont; caption_bold: boolean;
  title_color: string; title_size: number; title_font: CarouselFont; title_bold: boolean;
  gap: number; per_desktop: number; per_mobile: number;
  arrows: boolean; arrow_color: string; autoplay: boolean; autoplay_ms: number;
  bg_on: boolean; bg_color: string; pad_x: number; pad_t: number; pad_b: number;
}

export type BenefitItem = Tier & { icon?: string; icon_svg?: string; link?: string };

export interface BenefitsDesign {
  bg: string; text: string; sub: string; border: string; radius: number;
  divider: boolean; item_card: boolean; mobile: 'carousel' | 'stack';
}

export interface IconSettings {
  position: IconPosition; size: number; color: string; bg: IconBg; bg_color: string;
}

export interface InfoCard {
  id: string; store_id: string; name: string; active: boolean;
  title: string; tiers: Tier[]; footer: string; placement: Placement;
  style_id: string | null; created_at: string; updated_at: string;
  kind: CardKind; icon_position: IconPosition; icon_size: number; icon_color: string | null;
  icon_bg: IconBg; icon_bg_color: string | null; design: Partial<BenefitsDesign> & Partial<CarouselDesign>;
}

export interface InfoCardInput {
  id?: string | null; name: string; active: boolean; title: string; tiers: Tier[];
  footer: string; placement: Placement; style_id: string | null;
  kind?: CardKind; icon_position?: IconPosition; icon_size?: number; icon_color?: string | null;
  icon_bg?: IconBg; icon_bg_color?: string | null; design?: BenefitsDesign | CarouselDesign;
}
