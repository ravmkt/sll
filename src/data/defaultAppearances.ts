export interface DefaultAppearance {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  widget_style: {
    desktop: Record<string, any>;
    mobile: Record<string, any>;
  };
}

const createMobileConfig = (color: string) => ({
  // Flutuante
  floating_format: 'portrait_9_16',
  floating_object_fit: 'cover',
  floating_width: 100,
  floating_position: 'fixed_bottom_left',
  floating_margin_bottom: 20,
  floating_margin_top: 20,
  floating_margin_side: 20,
  floating_border_color: color,
  floating_border_width: 2,
  floating_border_radius: 12,
  floating_show_cta: true,
  floating_auto_play: true,
  floating_show_play_icon: false,
  floating_show_close_button: false,

  // Carrossel
  carousel_style: 'stories',
  carousel_shape: 'portrait',
  carousel_item_size: 80,
  carousel_gap: 12,
  carousel_border_color: color,
  carousel_position: 'top',
  carousel_custom_selector: '',
  carousel_infinite: false,
  carousel_visible_items: 2.5,
  carousel_show_title: true,
  carousel_title_bold: false,
  carousel_title_text: 'Carrossel',
  carousel_title_align: 'center',
  carousel_title_font_size: 16,
  carousel_show_play_icon: false,

  // Carrossel Dinâmico
  dynamic_carousel_item_size: 80,
  dynamic_carousel_gap: 8,
  dynamic_carousel_border_color: color,
  dynamic_carousel_highlight_shadow: false,
  dynamic_carousel_highlight_enlarge_active: false,
  dynamic_carousel_highlight_desaturate_inactive: false,
  dyn_carousel_size_mode: 'items',
  dyn_carousel_visible_items: 2,
  dyn_carousel_show_product: true,
  dyn_carousel_product_card_name_size: 12,
  dyn_carousel_product_card_price_size: 12,
  dyn_carousel_highlight_enlarge_active: true,
  dyn_carousel_highlight_desaturate_inactive: true,

  // Grade
  grid_columns: 2,
  grid_gap: 12,
  grid_border_color: color,
  grid_border_radius: 12,
  grid_margin_top: 20,
  grid_show_title: true,
  grid_title_bold: false,
  grid_show_product: true,
  grid_show_play_icon: false,
  grid_autoplay_videos: true,
  grid_sequential_playback: true,
  grid_product_card_name_size: 12,
  grid_product_card_price_size: 12,

  // Player/Modal
  modal_border_color: color,
  modal_border_width: 2,
  modal_border_radius: 12,
  modal_show_title: true,
  modal_show_like_button: true,
  modal_show_comment_button: true,
  modal_show_share_button: true,
  modal_show_product: true,
  modal_product_card_name_size: 14,
  modal_product_card_price_size: 14,
});

const createDesktopConfig = (color: string) => ({
  // Flutuante
  floating_format: 'portrait_9_16',
  floating_object_fit: 'cover',
  floating_width: 100,
  floating_position: 'fixed_bottom_left',
  floating_margin_bottom: 20,
  floating_margin_top: 20,
  floating_margin_side: 20,
  floating_border_color: color,
  floating_border_width: 2,
  floating_border_radius: 12,
  floating_show_cta: true,
  floating_auto_play: true,
  floating_show_play_icon: false,
  floating_show_close_button: false,

  // Carrossel
  carousel_style: 'stories',
  carousel_shape: 'portrait',
  carousel_item_size: 80,
  carousel_size_mode: 'width',
  carousel_width: 220,
  carousel_gap: 12,
  carousel_border_color: color,
  carousel_position: 'top',
  carousel_custom_selector: '',
  carousel_infinite: false,
  carousel_visible_items: 2.5,
  carousel_show_title: true,
  carousel_title_bold: false,
  carousel_title_text: 'Carrossel',
  carousel_title_align: 'center',
  carousel_title_font_size: 24,
  carousel_show_play_icon: false,
  carousel_product_card_name_size: 14,
  carousel_product_card_price_size: 14,

  // Carrossel Dinâmico
  dynamic_carousel_item_size: 80,
  dynamic_carousel_gap: 8,
  dynamic_carousel_border_color: color,
  dynamic_carousel_highlight_shadow: false,
  dynamic_carousel_highlight_enlarge_active: false,
  dynamic_carousel_highlight_desaturate_inactive: false,
  dyn_carousel_size_mode: 'items',
  dyn_carousel_width: 220,
  dyn_carousel_visible_items: 2,
  dyn_carousel_show_title: true,
  dyn_carousel_title_bold: false,
  dyn_carousel_title_text: 'Carrossel',
  dyn_carousel_title_font_size: 24,
  dyn_carousel_show_play_icon: false,
  dyn_carousel_autoplay_videos: false,
  dyn_carousel_show_product: true,
  dyn_carousel_product_card_name_size: 14,
  dyn_carousel_product_card_price_size: 14,
  dyn_carousel_highlight_enlarge_active: true,
  dyn_carousel_highlight_desaturate_inactive: true,

  // Grade
  grid_columns: 2,
  grid_width: 160,
  grid_gap: 12,
  grid_border_color: color,
  grid_border_radius: 12,
  grid_margin_top: 20,
  grid_show_title: true,
  grid_title_bold: false,
  grid_title_font_size: 24,
  grid_show_product: true,
  grid_show_play_icon: false,
  grid_autoplay_videos: true,
  grid_sequential_playback: true,
  grid_product_card_name_size: 14,
  grid_product_card_price_size: 14,

  // Player/Modal
  modal_border_color: color,
  modal_border_width: 2,
  modal_border_radius: 12,
  modal_show_title: true,
  modal_show_like_button: true,
  modal_show_comment_button: true,
  modal_show_share_button: true,
  modal_show_product: true,
  modal_product_card_name_size: 14,
  modal_product_card_price_size: 14,
});

export const DEFAULT_APPEARANCES: DefaultAppearance[] = [
  {
    id: 'DEFAULT_VIDLYTICS',
    name: 'Vidlytics',
    description: 'Estilo padrão do sistema com a identidade azul Vidlytics.',
    imageUrl: '/assets/template-vidlytics.png',
    widget_style: {
      desktop: createDesktopConfig('#0094EB'),
      mobile: createMobileConfig('#0094EB'),
    },
  },
];

export const isDefaultAppearance = (id?: string | null): boolean => {
  if (!id) return false;
  return DEFAULT_APPEARANCES.some((d) => d.id === id);
};

export const getDefaultAppearanceById = (id?: string | null): DefaultAppearance | undefined => {
  if (!id) return undefined;
  return DEFAULT_APPEARANCES.find((d) => d.id === id);
};