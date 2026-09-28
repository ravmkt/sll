export interface Video {
  id: string;
  store_id?: string;
  title?: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  storage_path?: string;
  source_type?: 'upload' | 'youtube' | 'vimeo' | 'external' | string;
  active?: boolean;
  plays_count?: number;
  clicks_count?: number;
  conversion_count?: number;
  conversion_rate?: number;
  position?: number;
  duration?: number;
  created_at?: string;
  updated_at?: string;
  products?: any[];
}

export interface Story {
  id: string;
  store_id?: string;
  title: string;
  thumbnail_url?: string;
  active?: boolean;
  position?: number;
  view_count?: number;
  click_count?: number;
  cta_enabled?: boolean;
  cta_text?: string;
  cta_url?: string;
  appearance_id?: string;
  display_locations?: DisplayLocation[]; // múltiplas localizações por Story
  created_at?: string;
  updated_at?: string;
  story_videos?: StoryVideo[];
}

export interface StoryVideo {
  id: string;
  story_id: string;
  video_id: string;
  position: number;
  video?: Video;
}

export interface Appearance {
  id: string;
  store_id?: string;
  name?: string;
  primary_color?: string;
  accent_color?: string;
  border_radius?: string | number;
  position_type?: 'floating' | 'inline' | string;
  widget_layout?: 'stories' | 'reels' | 'grid' | string;
  title_color?: string;
  card_background_color?: string;
  font_family?: string;
  auto_play?: boolean;
  loop?: boolean;
  show_views?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GeneralSettings {
  id?: string;
  store_id?: string;
  gtm_id?: string;
  conversion_tag_enabled?: boolean;
  custom_css?: string;
}

// ── Regras de página / posição de exibição (tabela vid_display_locations) ──

export type PageRuleType =
  | 'all'
  | 'home'
  | 'product'
  | 'category'
  | 'cart'
  | 'checkout'
  | 'url_contains'
  | 'url_not_contains';

export type DisplayPosition =
  | 'beforebegin'
  | 'afterbegin'
  | 'beforeend'
  | 'afterend';

export interface DisplayLocation {
  id: string;
  storyId?: string;
  page: PageRuleType;
  pageValue: string | null;
  cssSelector: string;
  position: DisplayPosition;
  active?: boolean;
}

export const PAGE_RULE_LABELS: Record<PageRuleType, string> = {
  all: 'Todas as páginas',
  home: 'Página inicial',
  product: 'Página de produto',
  category: 'Página de categoria',
  cart: 'Carrinho',
  checkout: 'Checkout',
  url_contains: 'URL contém',
  url_not_contains: 'URL não contém',
};

export const DISPLAY_POSITION_LABELS: Record<DisplayPosition, string> = {
  beforebegin: 'Antes do elemento',
  afterbegin: 'No início do elemento',
  beforeend: 'No final do elemento',
  afterend: 'Depois do elemento',
};
