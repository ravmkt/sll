// =====================================================================
// VIDLYTICS - Tipagem do motor de Aparência (Widget Style)
// Fonte: legado AppearancePage.tsx (migrado e corrigido)
// Persistência: schema "vidlytics", tabela "vid_appearances",
//               coluna "widget_style" (JSONB)
// =====================================================================

export type DeviceType = 'desktop' | 'mobile';

export type ModalTab =
  | 'basic'
  | 'floating'
  | 'carousel'
  | 'dynamic_carousel'
  | 'grid'
  | 'modal';

export type WidgetShape = 'circle' | 'square' | 'portrait' | 'landscape' | 'rounded';

export type FloatingPosition =
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type PositionValue =
  | 'fixed_bottom_right'
  | 'fixed_bottom_left'
  | 'fixed_top_right'
  | 'fixed_top_left';

export type ResponsiveConfig<T> = {
  same_for_all: boolean;
  desktop: T;
  mobile: T;
};

// ──────────────────── Floating ────────────────────
export type FloatingConfig = {
  shape: WidgetShape;
  width: string;
  height: string;
  border_radius: string;
  position: PositionValue;
  floating_position: FloatingPosition;
  bottom_spacing: string;
  top_spacing: string;
  left_spacing: string;
  right_spacing: string;
  border_color: string;
  border_style: string;
  show_play_icon: boolean;
  object_fit: string;
  draggable: boolean;
  allow_close: boolean;
  z_index: string;
  autoplay_videos: boolean;
  show_cta: boolean;
  cta_text: string;
  cta_bg_color: string;
  cta_text_color: string;
  cta_font_size: number;
  cta_is_bold: boolean;
};

// ──────────────────── Carousel ────────────────────
export type CarouselConfig = {
  spacing: number;
  shape: WidgetShape;
  view_mode: string;
  margin_top: string;
  margin_bottom: string;
  visible_items: number;
  show_product: boolean;
  show_play_icon: boolean;
  auto_center: boolean;
  width: string;
  border_color: string;
  border_style: string;
  border_radius: string;
  object_fit: string;
  show_title: boolean;
  autoplay_videos: boolean;
  auto_highlight: boolean;
  product_card_bg: string;
  product_card_border_color: string;
  product_card_border_width: string;
  product_card_border_radius: string;
  product_card_name_size: string;
  product_card_name_color: string;
  product_card_price_size: string;
  product_card_price_color: string;
  product_card_price_bold: boolean;
};

// ──────────────────── Dynamic Carousel ────────────────────
export type DynamicCarouselConfig = Omit<
  CarouselConfig,
  | 'product_card_border_width'
  | 'product_card_border_radius'
  | 'product_card_name_size'
  | 'product_card_price_size'
> & {
  enabled: boolean;
  highlight_shadow: boolean;
  highlight_scale_up: boolean;
  highlight_scale_down_others: boolean;
  margin_left?: string;
  margin_right?: string;
  product_card_border_width?: string;
  product_card_border_radius?: string;
  product_card_name_size?: string;
  product_card_price_size?: string;
  title_text?: string;
  title_font_size?: number;
  title_align?: 'left' | 'center' | 'right';
  title_bold?: boolean;
};

// ──────────────────── Grid ────────────────────
export type GridConfig = {
  visible_items: number;
  margin_left?: string;
  margin_right?: string;
  margin_top?: string;
  margin_bottom?: string;
  rows: number;
  spacing: number;
  shape: WidgetShape;
  width: string;
  border_color: string;
  border_style: string;
  border_radius: string;
  object_fit: string;
  show_title: boolean;
  autoplay_videos: boolean;
  sequential_playback: boolean;
};

// ──────────────────── Modal ────────────────────
export type ModalConfig = {
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_product_button: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_share_button: boolean;
  show_whatsapp_button?: boolean;
  hide_stories?: boolean;
  shadow_enabled?: boolean;
  border_color: string;
  border_width: string;
  border_radius: string;
  product_card_bg?: string;
  product_card_border_color?: string;
  product_card_border_width?: string;
  product_card_border_radius?: string;
  product_card_name_size?: string;
  product_card_name_color?: string;
  product_card_price_size?: string;
  product_card_price_color?: string;
};

export type PreviewColors = {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  button: string;
  floatingBorder: string;
};

// =====================================================================
// AppearanceBase: campos "flat" legados (identidade visual + legado)
// =====================================================================
export type AppearanceBase = {
  id: string;
  store_id: string;
  created_at?: string;
  updated_at?: string;

  name?: string;
  is_default?: boolean;
  use_global_appearance?: boolean;

  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  button_color?: string;
  font_family?: string;
  font_size?: string;
  border_radius?: number;
  shadow_enabled?: boolean;

  widget_shape?: string;
  widget_size?: string;
  widget_animation?: string;

  carousel_shape?: string;
  carousel_size?: string | number;
  carousel_card_shape?: string;
  carousel_visible_items?: number;
  carousel_spacing?: number;
  carousel_gap?: number;
  carousel_border_color?: string;
  carousel_border_width?: string | number;
  carousel_border_radius?: string | number;
  carousel_object_fit?: string;
  carousel_margin_top?: string | number;
  carousel_margin_bottom?: string | number;
  carousel_show_title?: boolean;
  carousel_show_product?: boolean;
  carousel_show_play_button?: boolean;
  carousel_auto_center?: boolean;
  carousel_view_mode?: string;

  grid_shape?: string;
  grid_columns?: string;
  grid_rows?: string;
  grid_spacing?: string;
  grid_size?: string;
  grid_border_color?: string;
  grid_border_width?: string;
  grid_border_radius?: string;
  grid_object_fit?: string;
  grid_show_title?: boolean;
  grid_margin_top?: string | number;
  grid_margin_bottom?: string | number;

  modal_show_title?: boolean;
  modal_show_play_button?: boolean;
  modal_show_product?: boolean;
  modal_show_like_button?: boolean;
  modal_show_comment_button?: boolean;
  modal_show_share_button?: boolean;
  modal_show_whatsapp_button?: boolean;
  modal_show_product_button?: boolean;
  modal_hide_stories?: boolean;
  modal_shadow_enabled?: boolean;
  modal_border_color?: string;
  modal_border_width?: string | number;
  modal_border_radius?: string | number;

  show_title?: boolean;
  show_play_button?: boolean;
  show_product?: boolean;
  show_like_button?: boolean;
  show_comment_button?: boolean;
  show_share_button?: boolean;
  show_whatsapp_button?: boolean;
  show_product_button?: boolean;

  url?: string | null;

  isDefault?: boolean;
  useGlobalAppearance?: boolean;
};

// =====================================================================
// ExtendedAppearance: shape completo armazenado em widget_style (JSONB)
// =====================================================================
export type ExtendedAppearance = AppearanceBase & {
  useGlobalAppearance: boolean;
  use_global_appearance?: boolean;

  floating_config: ResponsiveConfig<FloatingConfig>;
  carousel_config: ResponsiveConfig<CarouselConfig>;
  dynamic_carousel_config: ResponsiveConfig<DynamicCarouselConfig>;
  grid_config: ResponsiveConfig<GridConfig>;
  modal_config: ModalConfig;

  width: string;
  unit: 'px' | 'percent';
  height: string;

  position: PositionValue;
  floating_position: FloatingPosition;

  bottom_spacing: string;
  top_spacing: string;
  left_spacing: string;
  right_spacing: string;

  cta_text: string;
  cta_size: string;
  cta_duration: string;
  border_style: string;
  color: string;
  show_play_icon: boolean;
  auto_center: boolean;
  carousel_view_mode: string;
  margin_top: string;
  margin_bottom: string;
  draggable: boolean;
  allow_close: boolean;
  object_fit: string;
  z_index: string;
  desktop_columns: number;
  desktop_rows: number;
  desktop_gap: number;
  mobile_columns: number;
  mobile_rows: number;
  mobile_gap: number;
  font_size: string;

  url?: string | null;

  show_product_button: boolean;

  target_selector?: string;
  insert_position?: 'after' | 'before' | 'prepend' | 'append';
};

// =====================================================================
// VidAppearanceRow: shape real da linha no banco (vidlytics.vid_appearances)
// =====================================================================
export type VidAppearanceRow = {
  id: string;
  store_id: string;
  name: string;
  is_default: boolean;
  widget_style: ExtendedAppearance;
  created_at?: string;
  updated_at?: string;
};
