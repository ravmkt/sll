// =====================================================================
// VIDLYTICS - Defaults e normalizadores do motor de Aparência
// Fonte: legado AppearancePage.tsx (migrado, sem alteração de comportamento)
// =====================================================================

import type {
  DeviceType,
  ResponsiveConfig,
  FloatingConfig,
  CarouselConfig,
  DynamicCarouselConfig,
  GridConfig,
  ModalConfig,
  ExtendedAppearance,
} from '@/types/vidlytics-appearance';

// ──────────────────── Floating ────────────────────
export const createDefaultFloatingDesktopConfig = (): FloatingConfig => ({
  shape: 'portrait',
  width: '80',
  height: '142',
  border_radius: '12',
  position: 'fixed_bottom_right',
  floating_position: 'bottom-right',
  bottom_spacing: '20',
  top_spacing: '20',
  left_spacing: '20',
  right_spacing: '20',
  border_color: '#0094EB',
  border_style: '2',
  show_play_icon: true,
  object_fit: 'cover',
  draggable: false,
  allow_close: false,
  z_index: '2147483647',
  autoplay_videos: true,
  show_cta: false,
  cta_text: 'VER VÍDEO',
  cta_bg_color: '#0094EB',
  cta_text_color: '#FFFFFF',
  cta_font_size: 14,
  cta_is_bold: true,
});

export const createDefaultFloatingMobileConfig = (): FloatingConfig => ({
  shape: 'portrait',
  width: '64',
  height: '114',
  border_radius: '12',
  position: 'fixed_bottom_right',
  floating_position: 'bottom-right',
  bottom_spacing: '16',
  top_spacing: '16',
  left_spacing: '16',
  right_spacing: '16',
  border_color: '#0094EB',
  border_style: '2',
  show_play_icon: true,
  object_fit: 'cover',
  draggable: false,
  allow_close: false,
  z_index: '2147483647',
  autoplay_videos: true,
  show_cta: false,
  cta_text: 'VER VÍDEO',
  cta_bg_color: '#0094EB',
  cta_text_color: '#FFFFFF',
  cta_font_size: 12,
  cta_is_bold: true,
});

// ──────────────────── Carousel ────────────────────
export const createDefaultCarouselDesktopConfig = (): CarouselConfig => ({
  spacing: 16,
  shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 4,
  show_product: true,
  show_play_icon: true,
  auto_center: true,
  width: '80',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '12',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  auto_highlight: false,
});

export const createDefaultCarouselMobileConfig = (): CarouselConfig => ({
  spacing: 12,
  shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 2,
  show_product: true,
  show_play_icon: true,
  auto_center: true,
  width: '64',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '10',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '10',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  auto_highlight: false,
});

// ──────────────────── Dynamic Carousel ────────────────────
export const createDefaultDynamicCarouselDesktopConfig = (): DynamicCarouselConfig => ({
  ...createDefaultCarouselDesktopConfig(),
  enabled: true,
  highlight_shadow: false,
  highlight_scale_up: false,
  highlight_scale_down_others: false,
  margin_left: '0',
  margin_right: '0',
});

export const createDefaultDynamicCarouselMobileConfig = (): DynamicCarouselConfig => ({
  ...createDefaultCarouselMobileConfig(),
  enabled: true,
  highlight_shadow: false,
  highlight_scale_up: false,
  highlight_scale_down_others: false,
  margin_left: '0',
  margin_right: '0',
});

// ──────────────────── Grid ────────────────────
export const createDefaultGridDesktopConfig = (): GridConfig => ({
  visible_items: 4,
  rows: 1,
  spacing: 16,
  shape: 'portrait',
  width: '80',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  sequential_playback: false,
  margin_left: '0',
  margin_right: '0',
  margin_top: '0',
  margin_bottom: '0',
});

export const createDefaultGridMobileConfig = (): GridConfig => ({
  visible_items: 2,
  rows: 2,
  spacing: 12,
  shape: 'portrait',
  width: '64',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '10',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  sequential_playback: false,
  margin_left: '0',
  margin_right: '0',
  margin_top: '0',
  margin_bottom: '0',
});

// ──────────────────── Modal ────────────────────
export const createDefaultModalConfig = (): ModalConfig & Record<string, any> => ({
  show_title: true,
  show_play_button: true,
  show_product: true,
  show_product_button: true,
  show_like_button: true,
  show_comment_button: true,
  show_share_button: true,
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '12',
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '12',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
});

// ──────────────────── Helpers de composição/normalização ────────────────────
export const createResponsiveConfig = <T,>(
  desktop: T,
  mobile: T,
  sameForAll = false,
): ResponsiveConfig<T> => ({
  same_for_all: sameForAll,
  desktop,
  mobile,
});

/**
 * Tenta fazer parse de um valor que pode chegar como string JSON
 * (ex: vindo direto de uma coluna jsonb mal tipada) ou já como objeto.
 */
export const parseJsonIfNeeded = <T,>(value: unknown): T | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
};

export const normalizeResponsiveConfig = <T extends Record<string, any>>({
  rawValue,
  desktopDefault,
  mobileDefault,
  legacyDesktop = {},
  legacyMobile = {},
  sameForAll = false,
}: {
  rawValue: unknown;
  desktopDefault: T;
  mobileDefault: T;
  legacyDesktop?: Partial<T>;
  legacyMobile?: Partial<T>;
  sameForAll?: boolean;
}): ResponsiveConfig<T> => {
  const parsed = parseJsonIfNeeded<ResponsiveConfig<T>>(rawValue);
  return {
    same_for_all: Boolean(parsed?.same_for_all ?? sameForAll),
    desktop: {
      ...desktopDefault,
      ...legacyDesktop,
      ...(parsed?.desktop || {}),
    },
    mobile: {
      ...mobileDefault,
      ...legacyMobile,
      ...(parsed?.mobile || {}),
    },
  };
};

export const getActiveResponsiveConfig = <T,>(
  config: ResponsiveConfig<T>,
  device: DeviceType,
  useGlobalAppearance: boolean,
): T => {
  if (useGlobalAppearance || config.same_for_all) return config.desktop;
  return config[device];
};

/**
 * Monta um ExtendedAppearance completo com todos os defaults,
 * pronto para ser usado como estado inicial do formulário / preview
 * quando a loja ainda não tem registro em vid_appearances.
 */
export const createDefaultFormData = (storeId?: string): ExtendedAppearance => {
  const now = new Date().toISOString();

  return {
    id: '',
    store_id: storeId || '',
    created_at: now,
    updated_at: now,

    name: 'Padrão',
    is_default: true,
    isDefault: true,
    use_global_appearance: true,
    useGlobalAppearance: true,

    primary_color: '#0094EB',
    secondary_color: '#fd8539',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',
    font_family: 'Inter',
    font_size: '14',
    border_radius: 12,
    shadow_enabled: true,

    widget_shape: 'portrait',
    widget_size: '80',
    widget_animation: 'none',

    floating_config: createResponsiveConfig(
      createDefaultFloatingDesktopConfig(),
      createDefaultFloatingMobileConfig(),
    ),
    carousel_config: createResponsiveConfig(
      createDefaultCarouselDesktopConfig(),
      createDefaultCarouselMobileConfig(),
    ),
    dynamic_carousel_config: createResponsiveConfig(
      createDefaultDynamicCarouselDesktopConfig(),
      createDefaultDynamicCarouselMobileConfig(),
    ),
    grid_config: createResponsiveConfig(
      createDefaultGridDesktopConfig(),
      createDefaultGridMobileConfig(),
    ),
    modal_config: createDefaultModalConfig(),

    width: '80',
    unit: 'px',
    height: '142',

    position: 'fixed_bottom_right',
    floating_position: 'bottom-right',

    bottom_spacing: '20',
    top_spacing: '20',
    left_spacing: '20',
    right_spacing: '20',

    cta_text: 'VER VÍDEO',
    cta_size: '14',
    cta_duration: '5',
    border_style: '2',
    color: '#0094EB',
    show_play_icon: true,
    auto_center: true,
    carousel_view_mode: 'preview',
    margin_top: '0',
    margin_bottom: '0',
    draggable: false,
    allow_close: false,
    object_fit: 'cover',
    z_index: '2147483647',
    desktop_columns: 4,
    desktop_rows: 1,
    desktop_gap: 16,
    mobile_columns: 2,
    mobile_rows: 2,
    mobile_gap: 12,
    font_size: '14',

    url: null,

    show_title: true,
    show_play_button: true,
    show_product: true,
    show_like_button: true,
    show_comment_button: true,
    show_share_button: true,
    show_whatsapp_button: true,
    show_product_button: true,
  };
};
