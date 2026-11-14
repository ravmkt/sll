import type { Placement } from '../components/widgets/WidgetPlacementPicker';
import type { Tier } from './widgets';

export type CardKind = 'info' | 'benefits';
export type IconPosition = 'top' | 'left' | 'right';
export type IconBg = 'none' | 'circle' | 'square';

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
  icon_bg: IconBg; icon_bg_color: string | null; design: Partial<BenefitsDesign>;
}

export interface InfoCardInput {
  id?: string | null; name: string; active: boolean; title: string; tiers: Tier[];
  footer: string; placement: Placement; style_id: string | null;
  kind?: CardKind; icon_position?: IconPosition; icon_size?: number; icon_color?: string | null;
  icon_bg?: IconBg; icon_bg_color?: string | null; design?: BenefitsDesign;
}
