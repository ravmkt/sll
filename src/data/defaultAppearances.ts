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

const createBaseConfig = (color: string) => ({
  // Flutuante
  floating_format: 'portrait_9_16',
  floating_object_fit: 'cover',
  floating_width: 80,
  floating_position: 'bottom-right',
  floating_margin_bottom: 20,
  floating_margin_top: 20,
  floating_margin_side: 20,
  floating_border_color: color,
  floating_border_width: 2,
  floating_border_radius: 12,
  floating_show_cta: false,
  floating_auto_play: true,
  floating_show_play_icon: true,
  floating_show_close_button: false,

  // Carrossel
  carousel_style: 'stories',
  carousel_item_size: 80,
  carousel_gap: 12,
  carousel_border_color: color,
  carousel_position: 'top',
  carousel_custom_selector: '',

  // Carrossel Dinâmico
  dynamic_carousel_item_size: 80,
  dynamic_carousel_gap: 8,
  dynamic_carousel_border_color: color,
  dynamic_carousel_highlight_shadow: false,
  dynamic_carousel_highlight_enlarge_active: false,
  dynamic_carousel_highlight_desaturate_inactive: false,

  // Grade
  grid_columns: 2,
  grid_gap: 12,
  grid_border_color: color,
  grid_border_radius: 12,
  grid_show_title: false,

  // Player/Modal
  modal_border_color: color,
  modal_border_width: 2,
  modal_border_radius: 12,
  modal_show_title: true,
  modal_show_like_button: true,
  modal_show_comment_button: true,
  modal_show_share_button: true,
  modal_show_product: true,
});

export const DEFAULT_APPEARANCES: DefaultAppearance[] = [
  {
    id: 'DEFAULT_VIDLYTICS',
    name: 'Vidlytics',
    description: 'Estilo padrão do sistema com a identidade azul Vidlytics.',
    imageUrl: '/templates/vidlytics-preview.png',
    widget_style: {
      desktop: createBaseConfig('#0094EB'),
      mobile: createBaseConfig('#0094EB'),
    },
  },
  {
    id: 'DEFAULT_LIVE',
    name: 'Live',
    description: 'Visual com destaque vermelho, ideal para transmissões ao vivo.',
    imageUrl: '/templates/live-preview.png',
    widget_style: {
      desktop: createBaseConfig('#EF4444'),
      mobile: createBaseConfig('#EF4444'),
    },
  },
  {
    id: 'DEFAULT_BLACK_FRIDAY',
    name: 'Black Friday',
    description: 'Preto e dourado/amarelo para campanhas de Black Friday.',
    imageUrl: '/templates/blackfriday-preview.png',
    widget_style: {
      desktop: createBaseConfig('#F59E0B'),
      mobile: createBaseConfig('#F59E0B'),
    },
  },
  {
    id: 'DEFAULT_NATAL',
    name: 'Natal',
    description: 'Vermelho e verde para campanhas natalinas.',
    imageUrl: '/templates/natal-preview.png',
    widget_style: {
      desktop: createBaseConfig('#DC2626'),
      mobile: createBaseConfig('#DC2626'),
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
